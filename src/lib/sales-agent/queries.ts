/**
 * Sales agent queries.
 */

import { ensureSalesAgent } from "@/lib/sales-agent/agent";
import {
  ensureSalesSettings,
  getSalesDashboard,
  loadDealSignals,
} from "@/lib/sales-agent/engine";
import type {
  SalesDealInsightRow,
  SalesEmailDraftRow,
  SalesFilters,
  SalesForecastSnapshotRow,
  SalesHistoryEventRow,
  SalesMeetingBriefRow,
} from "@/lib/sales-agent/types";
import { createClient } from "@/lib/supabase/server";

export async function bootstrapSalesAgent(
  organizationId: string,
  userId?: string | null,
) {
  const [settings, agent] = await Promise.all([
    ensureSalesSettings(organizationId),
    ensureSalesAgent(organizationId, userId),
  ]);
  return { settings, agent };
}

export { getSalesDashboard, loadDealSignals, ensureSalesSettings };

export async function listDealInsights(
  organizationId: string,
  filters: SalesFilters = {},
  limit = 100,
): Promise<SalesDealInsightRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from("sales_agent_deal_insights")
    .select("*")
    .eq("organization_id", organizationId)
    .order("priority_score", { ascending: false })
    .limit(limit);

  if (filters.minPriority != null) q = q.gte("priority_score", filters.minPriority);
  if (filters.riskLevel) q = q.eq("risk_level", filters.riskLevel);
  if (filters.minConfidence != null) {
    q = q.gte("ai_confidence", filters.minConfidence);
  }
  if (filters.closingBefore) {
    q = q.lte("predicted_close_date", filters.closingBefore);
  }

  const { data } = await q;
  return (data ?? []) as SalesDealInsightRow[];
}

export async function listSalesHistory(organizationId: string, limit = 100) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sales_agent_history_events")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as SalesHistoryEventRow[];
}

export async function listEmailDrafts(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sales_agent_email_drafts")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as SalesEmailDraftRow[];
}

export async function listMeetingBriefs(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sales_agent_meeting_briefs")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as SalesMeetingBriefRow[];
}

export async function listForecastSnapshots(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sales_agent_forecast_snapshots")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(20);
  return (data ?? []) as SalesForecastSnapshotRow[];
}

export async function listOpenDealsForSales(
  organizationId: string,
  filters: SalesFilters = {},
) {
  const supabase = await createClient();
  let q = supabase
    .from("crm_deals")
    .select(
      "id, title, value, status, probability, expected_close_date, owner_user_id, pipeline_id, stage_id, lead_ai_score, updated_at",
    )
    .eq("organization_id", organizationId)
    .eq("status", "open")
    .order("value", { ascending: false })
    .limit(100);

  if (filters.ownerUserId) q = q.eq("owner_user_id", filters.ownerUserId);
  if (filters.pipelineId) q = q.eq("pipeline_id", filters.pipelineId);
  if (filters.stageId) q = q.eq("stage_id", filters.stageId);
  if (filters.minLeadScore != null) {
    q = q.gte("lead_ai_score", filters.minLeadScore);
  }
  if (filters.minRevenue != null) q = q.gte("value", filters.minRevenue);
  if (filters.closingBefore) {
    q = q.lte("expected_close_date", filters.closingBefore);
  }
  if (filters.q) q = q.ilike("title", `%${filters.q}%`);

  const { data } = await q;
  return data ?? [];
}
