/**
 * Sales agent orchestration — load CRM signals, analyze, brief, persist.
 */

import { emitAiEvent } from "@/ai/events/bus";
import { analyzeDeal } from "@/lib/sales-agent/analysis";
import { ensureSalesAgent } from "@/lib/sales-agent/agent";
import {
  NEXT_BEST_ACTION_LABELS,
  type NextBestAction,
  type RiskLevel,
} from "@/lib/sales-agent/constants";
import { analyzePipelineHealth, computeForecast } from "@/lib/sales-agent/forecast";
import { logSalesEvent } from "@/lib/sales-agent/history";
import type {
  DailyBriefingSummary,
  DealSignalInput,
  PriorityItem,
  SalesAgentOrgSettingsRow,
  SalesDashboardStats,
} from "@/lib/sales-agent/types";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

export async function ensureSalesSettings(
  organizationId: string,
): Promise<SalesAgentOrgSettingsRow> {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("sales_agent_org_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (existing) return existing as SalesAgentOrgSettingsRow;

  const { data, error } = await supabase
    .from("sales_agent_org_settings")
    .insert({ organization_id: organizationId })
    .select("*")
    .single();

  if (error || !data) {
    return {
      organization_id: organizationId,
      enabled: true,
      approval_mode: "semi_autonomous",
      provider: "openai",
      model: "gpt-4.1-mini",
      forecast_sensitivity: 0.55,
      risk_threshold: 60,
      reminder_frequency_hours: 24,
      working_hours_start: 9,
      working_hours_end: 18,
      timezone: "Europe/Amsterdam",
      notification_rules_json: {},
      rate_limit_per_minute: 40,
      metadata_json: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
  return data as SalesAgentOrgSettingsRow;
}

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000));
}

export async function loadDealSignals(
  organizationId: string,
  limit = 200,
): Promise<DealSignalInput[]> {
  const supabase = await createClient();
  const { data: deals } = await supabase
    .from("crm_deals")
    .select(
      "id, title, value, status, probability, expected_close_date, last_stage_changed_at, updated_at, created_at, lead_ai_score, competitor, stage_id, owner_user_id",
    )
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  const dealRows = deals ?? [];
  if (dealRows.length === 0) return [];

  const dealIds = dealRows.map((d) => d.id);
  const stageIds = [
    ...new Set(dealRows.map((d) => d.stage_id).filter(Boolean)),
  ] as string[];

  const [{ data: tasks }, { data: notes }, { data: stages }] = await Promise.all([
    supabase
      .from("crm_tasks")
      .select("id, deal_id, status, due_at")
      .eq("organization_id", organizationId)
      .in("deal_id", dealIds),
    supabase
      .from("crm_notes")
      .select("id, deal_id, created_at")
      .eq("organization_id", organizationId)
      .in("deal_id", dealIds),
    stageIds.length
      ? supabase
          .from("crm_funnel_stages")
          .select("id, name, sort_order")
          .in("id", stageIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string; sort_order: number }> }),
  ]);

  const stageById = new Map(
    (stages ?? []).map((s) => [s.id, s] as const),
  );

  const now = Date.now();
  return dealRows.map((deal) => {
    const dealTasks = (tasks ?? []).filter((t) => t.deal_id === deal.id);
    const openTasks = dealTasks.filter((t) => t.status !== "done" && t.status !== "cancelled");
    const overdueTasks = openTasks.filter((t) => {
      if (!t.due_at) return false;
      return new Date(t.due_at).getTime() < now;
    });
    const dealNotes = (notes ?? []).filter((n) => n.deal_id === deal.id);
    const lastNote = dealNotes
      .map((n) => n.created_at)
      .sort()
      .at(-1);
    const lastActivityCandidates = [
      deal.updated_at,
      deal.last_stage_changed_at,
      lastNote,
    ].filter(Boolean) as string[];
    const lastActivity = lastActivityCandidates
      .map((iso) => new Date(iso).getTime())
      .filter((t) => !Number.isNaN(t))
      .sort((a, b) => b - a)[0];

    const stage = stageById.get(deal.stage_id);

    return {
      dealId: deal.id,
      title: deal.title,
      value: Number(deal.value ?? 0),
      status: deal.status,
      probability: deal.probability,
      expectedCloseDate: deal.expected_close_date,
      lastStageChangedAt: deal.last_stage_changed_at,
      updatedAt: deal.updated_at,
      createdAt: deal.created_at,
      leadAiScore: deal.lead_ai_score,
      competitor: deal.competitor,
      openTasks: openTasks.length,
      overdueTasks: overdueTasks.length,
      daysSinceLastActivity:
        lastActivity != null
          ? Math.floor((now - lastActivity) / (24 * 60 * 60 * 1000))
          : daysSince(deal.updated_at),
      noteCount: dealNotes.length,
      stageSortOrder: stage?.sort_order ?? null,
      stageName: stage?.name ?? null,
    };
  });
}

export async function analyzeAndPersistDeals(params: {
  organizationId: string;
  userId?: string | null;
  dealIds?: string[];
}): Promise<{ analyzed: number }> {
  const settings = await ensureSalesSettings(params.organizationId);
  if (!settings.enabled) return { analyzed: 0 };

  await ensureSalesAgent(params.organizationId, params.userId);
  const supabase = await createClient();
  let signals = await loadDealSignals(params.organizationId);
  if (params.dealIds?.length) {
    const set = new Set(params.dealIds);
    signals = signals.filter((s) => set.has(s.dealId));
  }

  let analyzed = 0;
  for (const signal of signals) {
    if (signal.status !== "open") continue;
    const result = analyzeDeal(signal);
    await supabase.from("sales_agent_deal_insights").upsert(
      {
        organization_id: params.organizationId,
        deal_id: signal.dealId,
        priority_score: result.priorityScore,
        closing_probability: result.closingProbability,
        expected_revenue: result.expectedRevenue,
        risk_level: result.riskLevel,
        risk_score: result.riskScore,
        predicted_close_date: result.predictedCloseDate,
        next_best_action: result.nextBestAction,
        obstacles_json: result.obstacles as Json,
        missed_activities_json: result.missedActivities as Json,
        coach_tips_json: result.coachTips as Json,
        opportunities_json: result.opportunities as Json,
        analysis_json: result as unknown as Json,
        ai_confidence: result.confidence,
        provider: settings.provider,
        model: settings.model,
        analyzed_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,deal_id" },
    );
    analyzed += 1;
  }

  await logSalesEvent({
    organizationId: params.organizationId,
    eventType: "deals.analyzed",
    summary: `Analyzed ${analyzed} open deals`,
    actorUserId: params.userId,
    payload: { analyzed },
    provider: settings.provider,
    model: settings.model,
  });

  await emitAiEvent({
    organizationId: params.organizationId,
    eventType: "workflow.finished",
    payload: { kind: "sales_deal_analysis", analyzed },
  });

  return { analyzed };
}

function greetingForHour(hour: number): string {
  if (hour < 12) return "Goedemorgen.";
  if (hour < 18) return "Goedemiddag.";
  return "Goedenavond.";
}

export async function buildDailyBriefing(params: {
  organizationId: string;
  userId?: string | null;
}): Promise<DailyBriefingSummary> {
  const settings = await ensureSalesSettings(params.organizationId);
  const signals = await loadDealSignals(params.organizationId);
  const open = signals.filter((s) => s.status === "open");

  const analyses = open.map((s) => ({ signal: s, analysis: analyzeDeal(s) }));

  const followUps = analyses.filter(
    (a) =>
      (a.signal.daysSinceLastActivity ?? 0) >= 7 ||
      a.signal.overdueTasks > 0 ||
      ["call", "follow_up", "send_reminder", "send_email"].includes(
        a.analysis.nextBestAction,
      ),
  ).length;

  const highRisk = analyses.filter(
    (a) =>
      a.analysis.riskScore >= settings.risk_threshold ||
      a.analysis.riskLevel === "high" ||
      a.analysis.riskLevel === "critical",
  ).length;

  const newOpportunities = analyses.reduce(
    (sum, a) => sum + a.analysis.opportunities.length,
    0,
  );

  const waitingReply = analyses.filter(
    (a) =>
      (a.signal.daysSinceLastActivity ?? 0) >= 5 &&
      a.signal.openTasks === 0,
  ).length;

  const today = new Date().toISOString().slice(0, 10);
  const expiringQuotes = open.filter(
    (s) => s.expectedCloseDate && s.expectedCloseDate.slice(0, 10) === today,
  ).length;

  const priorities: PriorityItem[] = analyses
    .map((a) => ({
      dealId: a.signal.dealId,
      title: a.signal.title,
      priorityScore: a.analysis.priorityScore,
      riskLevel: a.analysis.riskLevel,
      nextBestAction: a.analysis.nextBestAction,
      reason:
        a.analysis.coachTips[0] ??
        NEXT_BEST_ACTION_LABELS[a.analysis.nextBestAction as NextBestAction],
      value: a.signal.value,
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 12);

  const hour = new Date().getHours();
  const greeting = `${greetingForHour(hour)} Vandaag adviseert AI:`;

  const summary: DailyBriefingSummary = {
    greeting,
    followUps,
    highRisk,
    newOpportunities,
    waitingReply,
    expiringQuotes,
    priorities,
  };

  const supabase = await createClient();
  await supabase.from("sales_agent_daily_briefings").upsert(
    {
      organization_id: params.organizationId,
      user_id: params.userId ?? null,
      briefing_date: today,
      greeting,
      summary_json: {
        followUps,
        highRisk,
        newOpportunities,
        waitingReply,
        expiringQuotes,
      } as Json,
      priorities_json: priorities as unknown as Json,
      follow_ups_count: followUps,
      high_risk_count: highRisk,
      new_opportunities_count: newOpportunities,
      waiting_reply_count: waitingReply,
      expiring_quotes_count: expiringQuotes,
      provider: settings.provider,
      model: settings.model,
    },
    { onConflict: "organization_id,briefing_date" },
  );

  return summary;
}

export async function getSalesDashboard(
  organizationId: string,
  userId?: string | null,
): Promise<SalesDashboardStats> {
  const settings = await ensureSalesSettings(organizationId);
  const signals = await loadDealSignals(organizationId);
  const briefing = await buildDailyBriefing({ organizationId, userId });
  const pipeline = analyzePipelineHealth(signals);
  const forecast = computeForecast(
    signals,
    Number(settings.forecast_sensitivity) || 0.55,
  );

  const supabase = await createClient();
  const { count } = await supabase
    .from("sales_agent_deal_insights")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  return {
    briefing,
    pipeline,
    forecast,
    highRiskDeals: briefing.highRisk,
    topOpportunities: briefing.newOpportunities,
    recentRecommendations: briefing.priorities.slice(0, 8),
    analyzedDeals: count ?? 0,
  };
}

export function riskLabel(level: string): RiskLevel {
  if (level === "critical" || level === "high" || level === "medium") {
    return level;
  }
  return "low";
}
