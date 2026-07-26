import { ensureDefaultCrmSetup } from "@/lib/crm/bootstrap";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

export type CrmPipelineRow = Database["public"]["Tables"]["crm_pipelines"]["Row"];
export type CrmStageRow = Database["public"]["Tables"]["crm_funnel_stages"]["Row"];
export type CrmLeadRow = Database["public"]["Tables"]["crm_leads"]["Row"];
export type CrmDealRow = Database["public"]["Tables"]["crm_deals"]["Row"];
export type CrmTaskRow = Database["public"]["Tables"]["crm_tasks"]["Row"];
export type CrmNoteRow = Database["public"]["Tables"]["crm_notes"]["Row"];

export type CrmLeadWithRelations = CrmLeadRow & {
  pipeline: Pick<CrmPipelineRow, "id" | "name" | "color"> | null;
  stage: Pick<CrmStageRow, "id" | "name" | "color" | "slug" | "is_won" | "is_lost"> | null;
};

export type CrmDashboardStats = {
  newLeadsCount: number;
  openDealsCount: number;
  pipelineValue: number;
  wonDealsCount: number;
  tasksDueToday: number;
  conversionRate: number;
  leadsThisMonth: number;
  averageDealValue: number;
  dealsByStage: { stageId: string; stageName: string; color: string; count: number }[];
};

export type OrgMemberOption = {
  userId: string;
  fullName: string | null;
  label: string;
};

export type CrmDealWithRelations = CrmDealRow & {
  lead: Pick<CrmLeadRow, "id" | "company_name" | "contact_name"> | null;
  pipeline: Pick<CrmPipelineRow, "id" | "name" | "color"> | null;
  stage: Pick<CrmStageRow, "id" | "name" | "color"> | null;
};

async function withCrmReady(organizationId: string) {
  const supabase = await createClient();
  await ensureDefaultCrmSetup(supabase, organizationId);
  return supabase;
}

export async function listPipelines(
  organizationId: string,
): Promise<CrmPipelineRow[]> {
  const supabase = await withCrmReady(organizationId);
  const { data, error } = await supabase
    .from("crm_pipelines")
    .select("*")
    .eq("organization_id", organizationId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getPipeline(
  organizationId: string,
  pipelineId: string,
): Promise<CrmPipelineRow | null> {
  const supabase = await withCrmReady(organizationId);
  const { data, error } = await supabase
    .from("crm_pipelines")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", pipelineId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function listStages(
  organizationId: string,
  pipelineId: string,
): Promise<CrmStageRow[]> {
  const supabase = await withCrmReady(organizationId);
  const { data, error } = await supabase
    .from("crm_funnel_stages")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("pipeline_id", pipelineId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listAllStages(
  organizationId: string,
): Promise<CrmStageRow[]> {
  const supabase = await withCrmReady(organizationId);
  const { data, error } = await supabase
    .from("crm_funnel_stages")
    .select("*")
    .eq("organization_id", organizationId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getDefaultPipeline(
  organizationId: string,
): Promise<CrmPipelineRow | null> {
  const pipelines = await listPipelines(organizationId);
  return pipelines.find((item) => item.is_default) ?? pipelines[0] ?? null;
}

export async function listLeads(
  organizationId: string,
  pipelineId?: string,
): Promise<CrmLeadWithRelations[]> {
  const supabase = await withCrmReady(organizationId);
  let query = supabase
    .from("crm_leads")
    .select("*")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
    .limit(500);

  if (pipelineId) {
    query = query.eq("pipeline_id", pipelineId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const leads = data ?? [];
  if (leads.length === 0) return [];

  const pipelineIds = [...new Set(leads.map((lead) => lead.pipeline_id))];
  const stageIds = [...new Set(leads.map((lead) => lead.stage_id))];

  const [{ data: pipelines }, { data: stages }] = await Promise.all([
    supabase
      .from("crm_pipelines")
      .select("id, name, color")
      .eq("organization_id", organizationId)
      .in("id", pipelineIds),
    supabase
      .from("crm_funnel_stages")
      .select("id, name, color, slug, is_won, is_lost")
      .eq("organization_id", organizationId)
      .in("id", stageIds),
  ]);

  const pipelineMap = new Map((pipelines ?? []).map((row) => [row.id, row]));
  const stageMap = new Map((stages ?? []).map((row) => [row.id, row]));

  return leads.map((lead) => ({
    ...lead,
    pipeline: pipelineMap.get(lead.pipeline_id) ?? null,
    stage: stageMap.get(lead.stage_id) ?? null,
  }));
}

export async function getLead(
  organizationId: string,
  leadId: string,
): Promise<CrmLeadWithRelations | null> {
  const supabase = await withCrmReady(organizationId);
  const { data, error } = await supabase
    .from("crm_leads")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", leadId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const [{ data: pipeline }, { data: stage }] = await Promise.all([
    supabase
      .from("crm_pipelines")
      .select("id, name, color")
      .eq("id", data.pipeline_id)
      .maybeSingle(),
    supabase
      .from("crm_funnel_stages")
      .select("id, name, color, slug, is_won, is_lost")
      .eq("id", data.stage_id)
      .maybeSingle(),
  ]);

  return {
    ...data,
    pipeline: pipeline ?? null,
    stage: stage ?? null,
  };
}

export async function listDeals(
  organizationId: string,
): Promise<CrmDealRow[]> {
  const supabase = await withCrmReady(organizationId);
  const { data, error } = await supabase
    .from("crm_deals")
    .select("*")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
    .limit(300);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listTasks(
  organizationId: string,
  leadId?: string,
): Promise<CrmTaskRow[]> {
  const supabase = await withCrmReady(organizationId);
  let query = supabase
    .from("crm_tasks")
    .select("*")
    .eq("organization_id", organizationId)
    .order("due_at", { ascending: true })
    .limit(300);

  if (leadId) {
    query = query.eq("lead_id", leadId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listNotes(
  organizationId: string,
  leadId?: string,
): Promise<CrmNoteRow[]> {
  const supabase = await withCrmReady(organizationId);
  let query = supabase
    .from("crm_notes")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (leadId) {
    query = query.eq("lead_id", leadId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listLeadActivities(
  organizationId: string,
  leadId: string,
  limit = 50,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_events")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("entity_type", "crm_lead")
    .eq("entity_id", leadId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listOrganizationMembers(
  organizationId: string,
): Promise<OrgMemberOption[]> {
  const supabase = await createClient();
  const { data: members, error } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);
  const userIds = [...new Set((members ?? []).map((row) => row.user_id))];
  if (userIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name")
    .in("user_id", userIds);

  const profileMap = new Map(
    (profiles ?? []).map((row) => [row.user_id, row.full_name]),
  );

  return userIds.map((userId) => {
    const fullName = profileMap.get(userId) ?? null;
    return {
      userId,
      fullName,
      label: fullName?.trim() || `Gebruiker ${userId.slice(0, 8)}`,
    };
  });
}

export async function getDeal(
  organizationId: string,
  dealId: string,
): Promise<CrmDealWithRelations | null> {
  const supabase = await withCrmReady(organizationId);
  const { data, error } = await supabase
    .from("crm_deals")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", dealId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const [lead, pipeline, stage] = await Promise.all([
    data.lead_id
      ? supabase
          .from("crm_leads")
          .select("id, company_name, contact_name")
          .eq("id", data.lead_id)
          .maybeSingle()
          .then((result) => result.data)
      : Promise.resolve(null),
    supabase
      .from("crm_pipelines")
      .select("id, name, color")
      .eq("id", data.pipeline_id)
      .maybeSingle()
      .then((result) => result.data),
    supabase
      .from("crm_funnel_stages")
      .select("id, name, color")
      .eq("id", data.stage_id)
      .maybeSingle()
      .then((result) => result.data),
  ]);

  return {
    ...data,
    lead: lead ?? null,
    pipeline: pipeline ?? null,
    stage: stage ?? null,
  };
}

export async function listDealsWithRelations(
  organizationId: string,
): Promise<CrmDealWithRelations[]> {
  const deals = await listDeals(organizationId);
  if (deals.length === 0) return [];

  const supabase = await createClient();
  const leadIds = [
    ...new Set(
      deals
        .map((deal) => deal.lead_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const pipelineIds = [...new Set(deals.map((deal) => deal.pipeline_id))];
  const stageIds = [...new Set(deals.map((deal) => deal.stage_id))];

  const [{ data: leads }, { data: pipelines }, { data: stages }] =
    await Promise.all([
      leadIds.length
        ? supabase
            .from("crm_leads")
            .select("id, company_name, contact_name")
            .eq("organization_id", organizationId)
            .in("id", leadIds)
        : Promise.resolve({ data: [] }),
      supabase
        .from("crm_pipelines")
        .select("id, name, color")
        .eq("organization_id", organizationId)
        .in("id", pipelineIds),
      supabase
        .from("crm_funnel_stages")
        .select("id, name, color")
        .eq("organization_id", organizationId)
        .in("id", stageIds),
    ]);

  const leadMap = new Map((leads ?? []).map((row) => [row.id, row]));
  const pipelineMap = new Map((pipelines ?? []).map((row) => [row.id, row]));
  const stageMap = new Map((stages ?? []).map((row) => [row.id, row]));

  return deals.map((deal) => ({
    ...deal,
    lead: deal.lead_id ? (leadMap.get(deal.lead_id) ?? null) : null,
    pipeline: pipelineMap.get(deal.pipeline_id) ?? null,
    stage: stageMap.get(deal.stage_id) ?? null,
  }));
}

export async function getCrmDashboardStats(
  organizationId: string,
): Promise<CrmDashboardStats> {
  const supabase = await withCrmReady(organizationId);
  const pipeline = await getDefaultPipeline(organizationId);
  const stages = pipeline
    ? await listStages(organizationId, pipeline.id)
    : [];

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [{ data: leads }, { data: deals }, { data: tasks }] = await Promise.all([
    supabase
      .from("crm_leads")
      .select("id, stage_id, deal_value, status, created_at")
      .eq("organization_id", organizationId)
      .limit(1000),
    supabase
      .from("crm_deals")
      .select("id, value, status, created_at")
      .eq("organization_id", organizationId)
      .limit(1000),
    supabase
      .from("crm_tasks")
      .select("id, due_at, status")
      .eq("organization_id", organizationId)
      .neq("status", "done")
      .neq("status", "cancelled")
      .limit(500),
  ]);

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const newLeadsCount = (leads ?? []).filter(
    (lead) => new Date(lead.created_at).getTime() >= weekAgo,
  ).length;

  const leadsThisMonth = (leads ?? []).filter(
    (lead) => new Date(lead.created_at).getTime() >= startOfMonth.getTime(),
  ).length;

  const openLeads = (leads ?? []).filter((lead) => lead.status === "open");
  const pipelineValue = openLeads.reduce(
    (sum, lead) => sum + Number(lead.deal_value ?? 0),
    0,
  );

  const openDeals = (deals ?? []).filter((deal) => deal.status === "open");
  const wonDeals = (deals ?? []).filter((deal) => deal.status === "won");
  const closedDeals = (deals ?? []).filter(
    (deal) => deal.status === "won" || deal.status === "lost",
  );
  const conversionRate =
    closedDeals.length === 0
      ? 0
      : Math.round((wonDeals.length / closedDeals.length) * 100);

  const averageDealValue =
    openDeals.length === 0
      ? 0
      : openDeals.reduce((sum, deal) => sum + Number(deal.value ?? 0), 0) /
        openDeals.length;

  const dealsByStage = stages.map((stage) => ({
    stageId: stage.id,
    stageName: stage.name,
    color: stage.color,
    count: (leads ?? []).filter((lead) => lead.stage_id === stage.id).length,
  }));

  const tasksDueToday = (tasks ?? []).filter((task) => {
    if (!task.due_at) return false;
    const due = new Date(task.due_at).getTime();
    return due >= todayStart.getTime() && due <= todayEnd.getTime();
  }).length;

  return {
    newLeadsCount,
    openDealsCount: openDeals.length,
    pipelineValue,
    wonDealsCount: wonDeals.length,
    tasksDueToday,
    conversionRate,
    leadsThisMonth,
    averageDealValue,
    dealsByStage,
  };
}
