/**
 * Phase 25G — server-side data loading for executive analytics.
 * Organization ID always comes from authenticated context (never client-trusted).
 */

import { createClient } from "@/lib/supabase/server";
import type { ExecutiveFilters } from "@/lib/crm/executive-analytics/types";
import {
  inDateRange,
  type ResolvedExecRange,
} from "@/lib/crm/executive-analytics/date-range";
import { effectiveDealProbability, weightedRevenue } from "@/lib/crm/pipeline/constants";

export type ExecDealRow = {
  id: string;
  value: number;
  currency: string;
  status: string;
  probability: number | null;
  stageProbability: number | null;
  stageId: string;
  stageName: string;
  expectedCloseDate: string | null;
  closedAt: string | null;
  createdAt: string;
  country: string | null;
  ownerUserId: string | null;
  pipelineId: string | null;
};

export type ExecLeadRow = {
  id: string;
  companyName: string;
  industry: string | null;
  country: string | null;
  region: string | null;
  ownerUserId: string | null;
  pipelineId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  leadScore: number | null;
  aiLeadScore: number | null;
  scoreClassification: string | null;
  opportunityBand: string | null;
  riskScore: number | null;
  scoreDelta: number | null;
  source: string | null;
  companyId: string | null;
};

type CountQuery = {
  eq: (column: string, value: string | boolean) => CountQuery;
  gte: (column: string, value: string) => CountQuery;
  lte: (column: string, value: string) => CountQuery;
  is: (column: string, value: null) => CountQuery;
  then: (
    onfulfilled?: (value: {
      count: number | null;
      error: { message: string } | null;
    }) => unknown,
  ) => PromiseLike<unknown>;
};

async function countTable(
  organizationId: string,
  table:
    | "companies"
    | "crm_lead_contacts",
  extra?: (q: CountQuery) => CountQuery,
): Promise<number | null> {
  try {
    const supabase = await createClient();
    let q = supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId) as unknown as CountQuery;
    if (extra) q = extra(q);
    const { count, error } = (await q) as {
      count: number | null;
      error: { message: string } | null;
    };
    if (error) return null;
    return count ?? 0;
  } catch {
    return null;
  }
}

export async function loadExecutiveRawSnapshot(
  organizationId: string,
  filters: ExecutiveFilters,
  range: ResolvedExecRange,
) {
  const supabase = await createClient();

  const [
    companiesTotal,
    companiesNew,
    contactsTotal,
    contactsNew,
    dealsRes,
    stagesRes,
    leadsRes,
    tasksOpenRes,
    activityRes,
    reportsRes,
    categoriesRes,
  ] = await Promise.all([
    countTable(organizationId, "companies"),
    countTable(organizationId, "companies", (q) =>
      q
        .gte("created_at", range.from.toISOString())
        .lte("created_at", range.to.toISOString()),
    ),
    countTable(organizationId, "crm_lead_contacts"),
    countTable(organizationId, "crm_lead_contacts", (q) =>
      q
        .gte("created_at", range.from.toISOString())
        .lte("created_at", range.to.toISOString()),
    ),
    supabase
      .from("crm_deals")
      .select(
        "id, value, currency, status, probability, expected_close_date, closed_at, stage_id, created_at, owner_user_id, pipeline_id",
      )
      .eq("organization_id", organizationId)
      .limit(2000),
    supabase
      .from("crm_funnel_stages")
      .select("id, name, color, probability, pipeline_id")
      .eq("organization_id", organizationId),
    supabase
      .from("crm_leads")
      .select(
        "id, company_name, industry, country, city, owner_user_id, pipeline_id, status, created_at, updated_at, lead_score, ai_lead_score, score_classification, opportunity_band, risk_score, score_delta, company_id, source",
      )
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false })
      .limit(2000),
    supabase
      .from("crm_tasks")
      .select("id, due_at, status, title")
      .eq("organization_id", organizationId)
      .neq("status", "done")
      .neq("status", "cancelled")
      .limit(500),
    supabase
      .from("activity_events")
      .select("id, event_type, entity_type, entity_id, created_at, description")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("crm_executive_reports")
      .select("id, name, is_favorite, is_default, updated_at, is_archived")
      .eq("organization_id", organizationId)
      .eq("is_archived", false)
      .order("updated_at", { ascending: false })
      .limit(50),
    supabase
      .from("company_categories")
      .select("id, name")
      .eq("organization_id", organizationId)
      .limit(200),
  ]);

  const stageMap = new Map(
    (stagesRes.data ?? []).map((s) => [s.id, s]),
  );

  let deals: ExecDealRow[] = (dealsRes.data ?? []).map((d) => {
    const stage = stageMap.get(d.stage_id);
    return {
      id: d.id,
      value: Number(d.value ?? 0),
      currency: (d.currency || "EUR").toUpperCase(),
      status: d.status,
      probability: d.probability != null ? Number(d.probability) : null,
      stageProbability:
        stage?.probability != null ? Number(stage.probability) : null,
      stageId: d.stage_id,
      stageName: stage?.name ?? "Unknown",
      expectedCloseDate: d.expected_close_date,
      closedAt: d.closed_at,
      createdAt: d.created_at,
      country: null,
      ownerUserId: d.owner_user_id,
      pipelineId: d.pipeline_id,
    };
  });

  let leads: ExecLeadRow[] = (leadsRes.data ?? []).map((l) => ({
    id: l.id,
    companyName: l.company_name,
    industry: l.industry,
    country: l.country,
    region: l.city,
    ownerUserId: l.owner_user_id,
    pipelineId: l.pipeline_id,
    status: l.status,
    createdAt: l.created_at,
    updatedAt: l.updated_at,
    leadScore: l.lead_score != null ? Number(l.lead_score) : null,
    aiLeadScore: l.ai_lead_score != null ? Number(l.ai_lead_score) : null,
    scoreClassification: l.score_classification,
    opportunityBand: l.opportunity_band,
    riskScore: l.risk_score != null ? Number(l.risk_score) : null,
    scoreDelta: l.score_delta != null ? Number(l.score_delta) : null,
    source: l.source,
    companyId: l.company_id,
  }));

  // Apply filters (server-side on loaded windows)
  if (filters.ownerUserId) {
    deals = deals.filter((d) => d.ownerUserId === filters.ownerUserId);
    leads = leads.filter((l) => l.ownerUserId === filters.ownerUserId);
  }
  if (filters.pipelineId) {
    deals = deals.filter((d) => d.pipelineId === filters.pipelineId);
    leads = leads.filter((l) => l.pipelineId === filters.pipelineId);
  }
  if (filters.dealStatus && filters.dealStatus !== "all") {
    deals = deals.filter((d) => d.status === filters.dealStatus);
  }
  if (filters.currency) {
    deals = deals.filter(
      (d) => d.currency === filters.currency!.toUpperCase(),
    );
  }
  if (filters.industry) {
    leads = leads.filter(
      (l) =>
        (l.industry || "").toLowerCase() === filters.industry!.toLowerCase(),
    );
  }
  if (filters.country) {
    leads = leads.filter(
      (l) =>
        (l.country || "").toLowerCase() === filters.country!.toLowerCase(),
    );
  }
  if (filters.region) {
    leads = leads.filter(
      (l) => (l.region || "").toLowerCase() === filters.region!.toLowerCase(),
    );
  }
  if (filters.leadClassification) {
    leads = leads.filter(
      (l) => l.scoreClassification === filters.leadClassification,
    );
  }
  if (filters.leadScoreMin != null) {
    leads = leads.filter(
      (l) => Number(l.aiLeadScore ?? l.leadScore ?? 0) >= filters.leadScoreMin!,
    );
  }
  if (filters.leadScoreMax != null) {
    leads = leads.filter(
      (l) => Number(l.aiLeadScore ?? l.leadScore ?? 0) <= filters.leadScoreMax!,
    );
  }

  const previousCompaniesNew = await countTable(
    organizationId,
    "companies",
    (q) =>
      q
        .gte("created_at", range.previousFrom.toISOString())
        .lte("created_at", range.previousTo.toISOString()),
  );
  const previousContactsNew = await countTable(
    organizationId,
    "crm_lead_contacts",
    (q) =>
      q
        .gte("created_at", range.previousFrom.toISOString())
        .lte("created_at", range.previousTo.toISOString()),
  );

  const companiesWithoutWebsite = await countTable(
    organizationId,
    "companies",
    (q) => q.is("website", null),
  );

  const contactsMissingEmail = await countTable(
    organizationId,
    "crm_lead_contacts",
    (q) => q.is("email", null),
  );
  const contactsMissingRole = await countTable(
    organizationId,
    "crm_lead_contacts",
    (q) => q.is("job_title", null),
  );
  const decisionMakers = await countTable(
    organizationId,
    "crm_lead_contacts",
    (q) => q.eq("is_decision_maker", true),
  );

  const tasks = tasksOpenRes.data ?? [];
  const now = Date.now();
  const overdueTasks = tasks.filter(
    (t) => t.due_at && new Date(t.due_at).getTime() < now,
  ).length;

  const staleCutoff = now - 30 * 24 * 60 * 60 * 1000;
  const staleLeads = leads.filter(
    (l) =>
      l.status === "open" && new Date(l.updatedAt).getTime() < staleCutoff,
  ).length;

  const leadsInRange = leads.filter((l) =>
    inDateRange(l.createdAt, range.from, range.to),
  );
  const leadsPrev = leads.filter((l) =>
    inDateRange(l.createdAt, range.previousFrom, range.previousTo),
  );

  return {
    companiesTotal,
    companiesNew,
    previousCompaniesNew,
    contactsTotal,
    contactsNew,
    previousContactsNew,
    companiesWithoutWebsite,
    contactsMissingEmail,
    contactsMissingRole,
    decisionMakers,
    deals,
    leads,
    leadsInRange,
    leadsPrev,
    stages: stagesRes.data ?? [],
    tasks,
    overdueTasks,
    staleLeads,
    activity: activityRes.data ?? [],
    activityError: activityRes.error?.message ?? null,
    reports: reportsRes.data ?? [],
    reportsError: reportsRes.error?.message ?? null,
    categories: categoriesRes.data ?? [],
    dealsError: dealsRes.error?.message ?? null,
    leadsError: leadsRes.error?.message ?? null,
  };
}

export function weightedOpenByCurrency(deals: ExecDealRow[]) {
  const open = deals.filter((d) => d.status === "open");
  return open.map((d) => ({
    value: weightedRevenue(
      d.value,
      effectiveDealProbability(d.probability, d.stageProbability),
    ),
    currency: d.currency,
  }));
}
