/**
 * Copilot read tools — reuse existing org-scoped queries.
 */

import { createClient } from "@/lib/supabase/server";
import type { CopilotConversationContext } from "@/lib/copilot/types";
import type {
  CopilotInsight,
  CopilotRecommendation,
  CopilotSearchHit,
} from "@/lib/copilot/types";

type Filters = NonNullable<CopilotConversationContext["filters"]>;

export async function searchCompaniesTool(
  organizationId: string,
  filters: Filters,
  limit = 12,
): Promise<CopilotSearchHit[]> {
  const supabase = await createClient();
  let q = supabase
    .from("companies")
    .select(
      "id, company_name, city, country, industry, website_url, created_at, updated_at",
    )
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
    .limit(80);

  if (filters.country) q = q.ilike("country", `%${filters.country}%`);
  if (filters.city) q = q.ilike("city", `%${filters.city}%`);
  if (filters.industry && filters.industry !== "bicycle") {
    q = q.ilike("industry", `%${filters.industry}%`);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  let rows = data ?? [];
  if (filters.query === "no_website") {
    rows = rows.filter((r) => !r.website_url);
  } else if (filters.query || filters.industry === "bicycle") {
    const needle = (
      filters.query === "bicycle" || filters.industry === "bicycle"
        ? "fiets|bicycle|bike|cycle"
        : (filters.query ?? filters.industry ?? "")
    ).toLowerCase();
    const parts = needle.split("|");
    rows = rows.filter((r) => {
      const hay = `${r.company_name} ${r.industry ?? ""}`.toLowerCase();
      return parts.some((p) => p && hay.includes(p));
    });
  }

  return rows.slice(0, limit).map((r) => ({
    id: r.id,
    type: "company",
    title: r.company_name,
    subtitle: [r.city, r.country, r.industry].filter(Boolean).join(" · "),
    href: `/companies/${r.id}`,
  }));
}

export async function searchLeadsTool(
  organizationId: string,
  filters: Filters,
  limit = 12,
): Promise<CopilotSearchHit[]> {
  const supabase = await createClient();
  let q = supabase
    .from("crm_leads")
    .select(
      "id, company_name, industry, country, city, ai_lead_score, score_classification, status, updated_at",
    )
    .eq("organization_id", organizationId)
    .order("ai_lead_score", { ascending: false, nullsFirst: false })
    .limit(100);

  if (filters.country) q = q.ilike("country", `%${filters.country}%`);
  if (filters.city) q = q.ilike("city", `%${filters.city}%`);
  if (filters.industry) q = q.ilike("industry", `%${filters.industry}%`);
  if (filters.classification === "hot") {
    q = q.in("score_classification", ["hot", "very_hot"]);
  } else if (filters.classification) {
    q = q.eq("score_classification", filters.classification);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  let rows = data ?? [];
  if (filters.leadScoreMin != null) {
    rows = rows.filter(
      (r) => Number(r.ai_lead_score ?? 0) >= filters.leadScoreMin!,
    );
  }
  return rows.slice(0, limit).map((r) => ({
    id: r.id,
    type: "lead",
    title: r.company_name,
    subtitle: [
      r.score_classification,
      r.ai_lead_score != null ? `score ${r.ai_lead_score}` : null,
      r.city,
      r.country,
    ]
      .filter(Boolean)
      .join(" · "),
    href: `/crm/leads/${r.id}`,
    score: r.ai_lead_score != null ? Number(r.ai_lead_score) : null,
  }));
}

export async function searchContactsTool(
  organizationId: string,
  filters: Filters,
  limit = 12,
): Promise<CopilotSearchHit[]> {
  const supabase = await createClient();
  let q = supabase
    .from("crm_lead_contacts")
    .select(
      "id, first_name, last_name, email, job_title, is_decision_maker, lead_id, country, quality_score",
    )
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (filters.decisionMakersOnly) q = q.eq("is_decision_maker", true);
  if (filters.country) q = q.ilike("country", `%${filters.country}%`);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  if (filters.query === "missing_decision_maker") {
    // Companies/leads without DMs: return contacts that are NOT DMs as a proxy signal
    // plus a dedicated message in engine — here list contacts lacking DM flag on lead groups
    const { data: leads } = await supabase
      .from("crm_leads")
      .select("id, company_name")
      .eq("organization_id", organizationId)
      .limit(80);
    const dmLeadIds = new Set(
      rows.filter((c) => c.is_decision_maker).map((c) => c.lead_id),
    );
    return (leads ?? [])
      .filter((l) => !dmLeadIds.has(l.id))
      .slice(0, limit)
      .map((l) => ({
        id: l.id,
        type: "lead",
        title: l.company_name,
        subtitle: "No decision maker flagged",
        href: `/crm/leads/${l.id}`,
      }));
  }

  return rows.slice(0, limit).map((c) => ({
    id: c.id,
    type: "contact",
    title:
      [c.first_name, c.last_name].filter(Boolean).join(" ").trim() ||
      c.email ||
      "Contact",
    subtitle: [
      c.job_title,
      c.is_decision_maker ? "Decision maker" : null,
      c.email,
    ]
      .filter(Boolean)
      .join(" · "),
    href: `/crm/leads/${c.lead_id}`,
    score: c.quality_score != null ? Number(c.quality_score) : null,
  }));
}

export async function searchDealsTool(
  organizationId: string,
  filters: Filters,
  limit = 12,
): Promise<CopilotSearchHit[]> {
  const supabase = await createClient();
  let q = supabase
    .from("crm_deals")
    .select("id, title, value, currency, status, updated_at, last_stage_changed_at")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (
    filters.dealStatus === "open" ||
    filters.dealStatus === "won" ||
    filters.dealStatus === "lost"
  ) {
    q = q.eq("status", filters.dealStatus);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  let rows = data ?? [];

  // Stuck = open + no stage change in 21+ days
  if (!filters.dealStatus) {
    const cutoff = Date.now() - 21 * 24 * 60 * 60 * 1000;
    const stuck = rows.filter((d) => {
      if (d.status !== "open") return false;
      const t = new Date(d.last_stage_changed_at ?? d.updated_at).getTime();
      return t < cutoff;
    });
    if (stuck.length) rows = stuck;
  }

  return rows.slice(0, limit).map((d) => ({
    id: d.id,
    type: "deal",
    title: d.title,
    subtitle: `${d.status} · ${d.value} ${d.currency}`,
    href: `/crm/deals/${d.id}`,
  }));
}

export async function searchTasksTool(
  organizationId: string,
  limit = 12,
): Promise<CopilotSearchHit[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_tasks")
    .select("id, title, due_at, status, priority, lead_id")
    .eq("organization_id", organizationId)
    .neq("status", "done")
    .neq("status", "cancelled")
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(80);
  if (error) throw new Error(error.message);
  const now = Date.now();
  const rows = (data ?? []).filter(
    (t) => t.due_at && new Date(t.due_at).getTime() < now,
  );
  return (rows.length ? rows : data ?? []).slice(0, limit).map((t) => ({
    id: t.id,
    type: "task",
    title: t.title,
    subtitle: [
      t.priority,
      t.due_at ? `due ${new Date(t.due_at).toLocaleDateString()}` : null,
    ]
      .filter(Boolean)
      .join(" · "),
    href: t.lead_id ? `/crm/leads/${t.lead_id}` : "/crm/tasks",
  }));
}

export async function searchCampaignsTool(
  organizationId: string,
  filters: Filters,
  limit = 12,
): Promise<CopilotSearchHit[]> {
  const supabase = await createClient();
  let q = supabase
    .from("email_campaigns")
    .select("id, name, status, updated_at")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
    .limit(40);
  if (filters.campaignStatus) q = q.eq("status", filters.campaignStatus);
  const { data, error } = await q;
  if (error) {
    // Campaigns table may be unavailable — return empty rather than crash
    return [];
  }
  return (data ?? []).slice(0, limit).map((c) => ({
    id: c.id,
    type: "campaign",
    title: c.name,
    subtitle: c.status,
    href: `/email/campaigns/${c.id}`,
  }));
}

export async function buildLiveInsights(
  organizationId: string,
): Promise<{ insights: CopilotInsight[]; recommendations: CopilotRecommendation[] }> {
  const supabase = await createClient();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [tasks, automations, scored] = await Promise.all([
    supabase
      .from("crm_tasks")
      .select("id, due_at, status")
      .eq("organization_id", organizationId)
      .neq("status", "done")
      .neq("status", "cancelled")
      .limit(200),
    supabase
      .from("crm_automation_runs")
      .select("id, status, created_at")
      .eq("organization_id", organizationId)
      .gte("created_at", startOfDay.toISOString())
      .limit(100),
    supabase
      .from("crm_leads")
      .select("id, ai_lead_score, score_classification, score_delta")
      .eq("organization_id", organizationId)
      .not("ai_lead_score", "is", null)
      .limit(200),
  ]);

  const insights: CopilotInsight[] = [];
  const recommendations: CopilotRecommendation[] = [];

  const overdue = (tasks.data ?? []).filter(
    (t) => t.due_at && new Date(t.due_at).getTime() < Date.now(),
  ).length;
  if (overdue > 0) {
    insights.push({
      id: "overdue_tasks",
      title: "Too many overdue tasks",
      detail: `${overdue} open task(s) are past due.`,
      severity: overdue >= 10 ? "critical" : "warning",
    });
    recommendations.push({
      id: "clear_tasks",
      title: "Clear overdue tasks",
      rationale: "Overdue work slows pipeline velocity.",
      href: "/crm/tasks",
      prompt: "Show overdue tasks.",
    });
  }

  const failedRuns = (automations.data ?? []).filter(
    (r) => r.status === "failed",
  ).length;
  if (failedRuns > 0) {
    insights.push({
      id: "automation_failures",
      title: "Automation failures increased",
      detail: `${failedRuns} failed automation run(s) today.`,
      severity: "warning",
    });
    recommendations.push({
      id: "fix_automations",
      title: "Inspect failing automations",
      rationale: "Repeated failures need attention.",
      href: "/crm/automations",
    });
  }

  const scoredRows = scored.data ?? [];
  const improved = scoredRows.filter((l) => Number(l.score_delta ?? 0) > 0).length;
  const hot = scoredRows.filter(
    (l) =>
      l.score_classification === "hot" || l.score_classification === "very_hot",
  ).length;
  if (improved > 0) {
    insights.push({
      id: "lead_quality_up",
      title: "Lead quality increased",
      detail: `${improved} scored lead(s) improved recently.`,
      severity: "positive",
    });
  }
  if (hot > 0) {
    recommendations.push({
      id: "call_hot",
      title: `Call ${hot} hot lead(s)`,
      rationale: "Highest priority outreach candidates.",
      href: "/crm/scoring",
      prompt: "Show hot leads above 85.",
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "stable",
      title: "No urgent anomalies detected",
      detail:
        "Based on overdue tasks, automation failures, and lead score deltas available today.",
      severity: "info",
    });
  }

  return { insights, recommendations };
}
