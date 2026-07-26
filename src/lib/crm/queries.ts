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
  pipelineValue: number;
  dealsByStage: { stageId: string; stageName: string; color: string; count: number }[];
  tasksDueToday: number;
  wonThisMonth: number;
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

  const [{ data: leads }, { data: tasks }, { count: wonThisMonth }] =
    await Promise.all([
      supabase
        .from("crm_leads")
        .select("id, stage_id, deal_value, status, created_at")
        .eq("organization_id", organizationId)
        .limit(1000),
      supabase
        .from("crm_tasks")
        .select("id, due_at, status")
        .eq("organization_id", organizationId)
        .neq("status", "done")
        .neq("status", "cancelled")
        .limit(500),
      supabase
        .from("crm_leads")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("status", "won")
        .gte("updated_at", startOfMonth.toISOString()),
    ]);

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const newLeadsCount = (leads ?? []).filter(
    (lead) => new Date(lead.created_at).getTime() >= weekAgo,
  ).length;

  const pipelineValue = (leads ?? [])
    .filter((lead) => lead.status === "open")
    .reduce((sum, lead) => sum + Number(lead.deal_value ?? 0), 0);

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
    pipelineValue,
    dealsByStage,
    tasksDueToday,
    wonThisMonth: wonThisMonth ?? 0,
  };
}
