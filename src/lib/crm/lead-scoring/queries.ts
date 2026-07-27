/**
 * Phase 25E — lead scoring queries & leaderboards.
 */

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

export type LeadScoringProfileRow =
  Database["public"]["Tables"]["lead_scoring_profiles"]["Row"];
export type LeadScoringHistoryRow =
  Database["public"]["Tables"]["lead_scoring_history"]["Row"];
export type LeadScoringAlertRow =
  Database["public"]["Tables"]["lead_scoring_alerts"]["Row"];

export type LeadScoreListFilters = {
  query?: string;
  classification?: string;
  opportunityBand?: string;
  buyingReadiness?: string;
  minScore?: number;
  maxRisk?: number;
  industry?: string;
  country?: string;
  ownerUserId?: string;
  pipelineId?: string;
};

export async function getLeadScoringProfile(
  organizationId: string,
  leadId: string,
): Promise<LeadScoringProfileRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lead_scoring_profiles")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("entity_type", "lead")
    .eq("lead_id", leadId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function listLeadScoreHistory(
  organizationId: string,
  leadId: string,
  limit = 30,
): Promise<LeadScoringHistoryRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lead_scoring_history")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listOpenScoringAlerts(
  organizationId: string,
  limit = 20,
): Promise<LeadScoringAlertRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lead_scoring_alerts")
    .select("*")
    .eq("organization_id", organizationId)
    .is("acknowledged_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listScoredLeads(
  organizationId: string,
  filters: LeadScoreListFilters = {},
  limit = 100,
) {
  const supabase = await createClient();
  let query = supabase
    .from("crm_leads")
    .select(
      "id, company_name, industry, country, owner_user_id, pipeline_id, lead_score, ai_lead_score, score_classification, opportunity_band, opportunity_confidence, risk_score, buying_readiness, scoring_confidence, scored_at, score_delta, status, updated_at",
    )
    .eq("organization_id", organizationId)
    .order("ai_lead_score", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (filters.classification && filters.classification !== "all") {
    query = query.eq("score_classification", filters.classification);
  }
  if (filters.opportunityBand && filters.opportunityBand !== "all") {
    query = query.eq("opportunity_band", filters.opportunityBand);
  }
  if (filters.buyingReadiness && filters.buyingReadiness !== "all") {
    query = query.eq("buying_readiness", filters.buyingReadiness);
  }
  if (typeof filters.minScore === "number") {
    query = query.gte("ai_lead_score", filters.minScore);
  }
  if (typeof filters.maxRisk === "number") {
    query = query.lte("risk_score", filters.maxRisk);
  }
  if (filters.industry?.trim()) {
    query = query.ilike("industry", `%${filters.industry.trim()}%`);
  }
  if (filters.country?.trim()) {
    query = query.ilike("country", `%${filters.country.trim()}%`);
  }
  if (filters.ownerUserId && filters.ownerUserId !== "all") {
    query = query.eq("owner_user_id", filters.ownerUserId);
  }
  if (filters.pipelineId && filters.pipelineId !== "all") {
    query = query.eq("pipeline_id", filters.pipelineId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let rows = data ?? [];
  if (filters.query?.trim()) {
    const needle = filters.query.trim().toLowerCase();
    rows = rows.filter((r) =>
      [r.company_name, r.industry ?? "", r.country ?? "", r.status]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }
  return rows;
}

export async function buildLeadScoringLeaderboards(organizationId: string) {
  const leads = await listScoredLeads(organizationId, {}, 200);
  const scored = leads.filter((l) => l.ai_lead_score != null);

  const highest = [...scored]
    .sort((a, b) => Number(b.ai_lead_score) - Number(a.ai_lead_score))
    .slice(0, 8);

  const fastestGrowing = [...scored]
    .filter((l) => (l.score_delta ?? 0) > 0)
    .sort((a, b) => Number(b.score_delta) - Number(a.score_delta))
    .slice(0, 8);

  const biggestOpportunities = [...scored]
    .filter(
      (l) =>
        l.opportunity_band === "very_high" || l.opportunity_band === "high",
    )
    .sort(
      (a, b) =>
        Number(b.opportunity_confidence ?? 0) -
        Number(a.opportunity_confidence ?? 0),
    )
    .slice(0, 8);

  const highestRisk = [...scored]
    .sort((a, b) => Number(b.risk_score ?? 0) - Number(a.risk_score ?? 0))
    .slice(0, 8);

  const recentlyImproved = [...scored]
    .filter((l) => (l.score_delta ?? 0) > 0 && l.scored_at)
    .sort((a, b) => String(b.scored_at).localeCompare(String(a.scored_at)))
    .slice(0, 8);

  const needsAttention = [...scored]
    .filter(
      (l) =>
        l.score_classification === "very_cold" ||
        l.score_classification === "cold" ||
        Number(l.risk_score ?? 0) >= 50 ||
        (l.score_delta ?? 0) < -5,
    )
    .slice(0, 8);

  return {
    highest,
    fastestGrowing,
    biggestOpportunities,
    highestRisk,
    recentlyImproved,
    needsAttention,
    totals: {
      scored: scored.length,
      hot: scored.filter(
        (l) =>
          l.score_classification === "hot" ||
          l.score_classification === "very_hot",
      ).length,
      avgScore:
        scored.length === 0
          ? 0
          : Math.round(
              scored.reduce((n, l) => n + Number(l.ai_lead_score ?? 0), 0) /
                scored.length,
            ),
    },
  };
}
