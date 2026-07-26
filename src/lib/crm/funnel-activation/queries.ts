/**
 * Queries for campaign readiness + funnel activation dashboard.
 */

import { createClient } from "@/lib/supabase/server";

export type CampaignReadinessRow = {
  id: string;
  leadId: string;
  companyId: string | null;
  companyName: string;
  status: string;
  approvalStatus: string;
  salesPriority: string;
  personalizationStatus: string;
  preferredEmail: string | null;
  preferredName: string | null;
  qualificationScore: number;
  opportunityScore: number;
  priorityScore: number;
  reasons: string[];
  missingRequirements: string[];
  ownerUserId: string | null;
  source: string | null;
  updatedAt: string;
};

export type FunnelDashboardStats = {
  companiesEligibleEstimate: number;
  leadsCreated: number;
  leadsReused: number;
  qualifiedLeads: number;
  highPriority: number;
  campaignReady: number;
  needsReview: number;
  suppressed: number;
  failedRuns: number;
  tasksCreatedEstimate: number;
  duplicatesPreventedEstimate: number;
  recentRuns: Array<{
    id: string;
    status: string;
    companyId: string | null;
    leadId: string | null;
    triggerSource: string;
    createdAt: string;
    warningCount: number;
  }>;
  readinessDistribution: Record<string, number>;
};

export async function listCampaignReady(
  organizationId: string,
  filters?: {
    status?: string;
    approval?: string;
    priority?: string;
  },
): Promise<CampaignReadinessRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("campaign_readiness")
    .select("*")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters?.approval && filters.approval !== "all") {
    query = query.eq("approval_status", filters.approval);
  }
  if (filters?.priority && filters.priority !== "all") {
    query = query.eq("sales_priority", filters.priority);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const leadIds = [...new Set((data ?? []).map((r) => r.lead_id))];
  const leadMap = new Map<
    string,
    { company_name: string; owner_user_id: string | null; source: string | null }
  >();
  if (leadIds.length) {
    const { data: leads } = await supabase
      .from("crm_leads")
      .select("id, company_name, owner_user_id, source")
      .eq("organization_id", organizationId)
      .in("id", leadIds);
    for (const lead of leads ?? []) {
      leadMap.set(lead.id, {
        company_name: lead.company_name,
        owner_user_id: lead.owner_user_id,
        source: lead.source,
      });
    }
  }

  return (data ?? []).map((row) => {
    const lead = leadMap.get(row.lead_id);
    return {
      id: row.id,
      leadId: row.lead_id,
      companyId: row.company_id,
      companyName: lead?.company_name ?? "Unknown",
      status: row.status,
      approvalStatus: row.approval_status,
      salesPriority: row.sales_priority,
      personalizationStatus: row.personalization_status,
      preferredEmail: row.preferred_email,
      preferredName: row.preferred_name,
      qualificationScore: row.qualification_score,
      opportunityScore: row.opportunity_score,
      priorityScore: row.priority_score,
      reasons: row.reasons ?? [],
      missingRequirements: row.missing_requirements ?? [],
      ownerUserId: lead?.owner_user_id ?? null,
      source: lead?.source ?? null,
      updatedAt: row.updated_at,
    };
  });
}

export async function getCampaignReadinessForLead(
  organizationId: string,
  leadId: string,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_readiness")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("lead_id", leadId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getLatestActivationForCompany(
  organizationId: string,
  companyId: string,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("funnel_activation_runs")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getFunnelDashboardStats(
  organizationId: string,
): Promise<FunnelDashboardStats> {
  const supabase = await createClient();

  const [{ data: runs }, { data: readiness }, { count: companiesWithWebsite }] =
    await Promise.all([
      supabase
        .from("funnel_activation_runs")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("campaign_readiness")
        .select("status, sales_priority, qualification_score")
        .eq("organization_id", organizationId)
        .limit(500),
      supabase
        .from("companies")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .not("website_url", "is", null),
    ]);

  let leadsCreated = 0;
  let leadsReused = 0;
  let tasksCreated = 0;
  let duplicates = 0;
  for (const run of runs ?? []) {
    const summary =
      run.result_summary &&
      typeof run.result_summary === "object" &&
      !Array.isArray(run.result_summary)
        ? (run.result_summary as Record<string, unknown>)
        : {};
    const statistics =
      summary.statistics &&
      typeof summary.statistics === "object" &&
      !Array.isArray(summary.statistics)
        ? (summary.statistics as Record<string, unknown>)
        : {};
    if (statistics.leadCreated) leadsCreated += 1;
    if (statistics.leadReused) leadsReused += 1;
    tasksCreated += Number(statistics.tasksCreated ?? 0);
    duplicates += Number(statistics.duplicatesPrevented ?? 0);
  }

  const readinessDistribution: Record<string, number> = {};
  let campaignReady = 0;
  let needsReview = 0;
  let suppressed = 0;
  let highPriority = 0;
  let qualifiedLeads = 0;

  for (const row of readiness ?? []) {
    readinessDistribution[row.status] =
      (readinessDistribution[row.status] ?? 0) + 1;
    if (row.status === "ready" || row.status === "ready_with_review") {
      campaignReady += 1;
    }
    if (
      row.status === "needs_approval" ||
      row.status === "needs_contact" ||
      row.status === "needs_verification" ||
      row.status === "needs_personalization"
    ) {
      needsReview += 1;
    }
    if (row.status === "suppressed") suppressed += 1;
    if (row.sales_priority === "high" || row.sales_priority === "critical") {
      highPriority += 1;
    }
    if (row.qualification_score >= 50) qualifiedLeads += 1;
  }

  return {
    companiesEligibleEstimate: companiesWithWebsite ?? 0,
    leadsCreated,
    leadsReused,
    qualifiedLeads,
    highPriority,
    campaignReady,
    needsReview,
    suppressed,
    failedRuns: (runs ?? []).filter((r) => r.status === "failed").length,
    tasksCreatedEstimate: tasksCreated,
    duplicatesPreventedEstimate: duplicates,
    recentRuns: (runs ?? []).slice(0, 15).map((run) => ({
      id: run.id,
      status: run.status,
      companyId: run.company_id,
      leadId: run.lead_id,
      triggerSource: run.trigger_source,
      createdAt: run.created_at,
      warningCount: run.warning_count,
    })),
    readinessDistribution,
  };
}
