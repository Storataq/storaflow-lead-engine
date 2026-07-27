/**
 * Prospecting queries.
 */

import { ensureProspectingAgent } from "@/lib/prospecting/agent";
import { ensureProspectingSettings } from "@/lib/prospecting/pipeline";
import type {
  ProspectFilters,
  ProspectingBulkJobRow,
  ProspectingDashboardStats,
  ProspectingHistoryEventRow,
  ProspectingOrgSettingsRow,
  ProspectingProspectRow,
  ProspectingResearchRunRow,
  ProspectingSearchRow,
} from "@/lib/prospecting/types";
import { createClient } from "@/lib/supabase/server";

export async function bootstrapProspecting(
  organizationId: string,
  userId?: string | null,
) {
  const [settings, agent] = await Promise.all([
    ensureProspectingSettings(organizationId),
    ensureProspectingAgent(organizationId, userId),
  ]);
  return { settings, agent };
}

export async function getProspectingDashboard(
  organizationId: string,
): Promise<ProspectingDashboardStats> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prospecting_prospects")
    .select(
      "id, company_name, status, lead_score, business_class, country, recommendation, created_at",
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .limit(2000);

  const rows = data ?? [];
  const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const scoreBuckets: Record<string, number> = {
    "0-24": 0,
    "25-49": 0,
    "50-74": 0,
    "75-100": 0,
  };
  const classDistribution: Record<string, number> = {};
  const countryDistribution: Record<string, number> = {};

  let scoreSum = 0;
  let scoredCount = 0;

  for (const row of rows) {
    const score = Number(row.lead_score ?? 0);
    scoreSum += score;
    if (score > 0) scoredCount += 1;
    if (score < 25) scoreBuckets["0-24"] += 1;
    else if (score < 50) scoreBuckets["25-49"] += 1;
    else if (score < 75) scoreBuckets["50-74"] += 1;
    else scoreBuckets["75-100"] += 1;

    const cls = row.business_class || "other";
    classDistribution[cls] = (classDistribution[cls] ?? 0) + 1;
    const country = row.country || "unknown";
    countryDistribution[country] = (countryDistribution[country] ?? 0) + 1;
  }

  const topOpportunities = rows.filter((r) => Number(r.lead_score) >= 70).length;

  return {
    totalProspects: rows.length,
    newProspects: rows.filter(
      (r) => new Date(r.created_at).getTime() >= since,
    ).length,
    topOpportunities,
    avgScore: rows.length ? Math.round(scoreSum / rows.length) : 0,
    scoredCount,
    crmLinked: rows.filter((r) => r.status === "crm_linked").length,
    scoreBuckets,
    classDistribution,
    countryDistribution,
    recentRecommendations: rows
      .slice()
      .sort((a, b) => Number(b.lead_score) - Number(a.lead_score))
      .slice(0, 8)
      .map((r) => ({
        id: r.id,
        company_name: r.company_name,
        recommendation: r.recommendation,
        lead_score: r.lead_score,
      })),
  };
}

export async function listProspects(
  organizationId: string,
  filters: ProspectFilters = {},
  limit = 100,
): Promise<ProspectingProspectRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from("prospecting_prospects")
    .select("*")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("lead_score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filters.minScore != null) q = q.gte("lead_score", filters.minScore);
  if (filters.maxScore != null) q = q.lte("lead_score", filters.maxScore);
  if (filters.country) q = q.ilike("country", filters.country);
  if (filters.region) q = q.ilike("region", filters.region);
  if (filters.industry) q = q.ilike("industry", `%${filters.industry}%`);
  if (filters.businessClass) q = q.eq("business_class", filters.businessClass);
  if (filters.employeeBand) q = q.eq("employee_band", filters.employeeBand);
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.recommendation) q = q.eq("recommendation", filters.recommendation);
  if (filters.minConfidence != null) {
    q = q.gte("ai_confidence", filters.minConfidence);
  }
  if (filters.q) {
    q = q.or(
      `company_name.ilike.%${filters.q}%,website_url.ilike.%${filters.q}%,city.ilike.%${filters.q}%`,
    );
  }

  const { data } = await q;
  let rows = (data ?? []) as ProspectingProspectRow[];
  if (filters.tag) {
    rows = rows.filter((r) => {
      const tags = Array.isArray(r.tags_json) ? r.tags_json : [];
      return tags.some(
        (t) =>
          typeof t === "string" &&
          t.toLowerCase() === filters.tag!.toLowerCase(),
      );
    });
  }
  return rows;
}

export async function listProspectingSearches(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prospecting_searches")
    .select("*")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  return (data ?? []) as ProspectingSearchRow[];
}

export async function listResearchRuns(organizationId: string, limit = 50) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prospecting_research_runs")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as ProspectingResearchRunRow[];
}

export async function listProspectingHistory(
  organizationId: string,
  limit = 100,
) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prospecting_history_events")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as ProspectingHistoryEventRow[];
}

export async function listBulkJobs(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prospecting_bulk_jobs")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as ProspectingBulkJobRow[];
}

export async function getProspectingSettings(
  organizationId: string,
): Promise<ProspectingOrgSettingsRow> {
  return ensureProspectingSettings(organizationId);
}

export async function listLinkedCompanies(organizationId: string) {
  const prospects = await listProspects(organizationId, {}, 200);
  return prospects.filter((p) => p.company_id);
}
