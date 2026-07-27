/**
 * Revenue Intelligence orchestration.
 */

import { emitAiEvent } from "@/ai/events/bus";
import { ensureRevenueIntelligenceAgent } from "@/lib/revenue-intelligence/agent";
import { analyzePipeline, computeHorizonForecasts } from "@/lib/revenue-intelligence/forecast";
import { logRevenueEvent } from "@/lib/revenue-intelligence/history";
import {
  analyzeGrowth,
  analyzeRevenueChurn,
  buildAlerts,
  buildExecutiveReport,
  buildInsights,
  buildRecommendations,
  detectExpansion,
  executiveSummary,
  runScenario,
} from "@/lib/revenue-intelligence/insights";
import { computeRevenueKpis } from "@/lib/revenue-intelligence/kpis";
import type { ReportType, ScenarioType } from "@/lib/revenue-intelligence/constants";
import type {
  RevenueBillingSignal,
  RevenueDashboardStats,
  RevenueDealSignal,
  RevenueInvoiceSignal,
  RevenueOrgSettingsRow,
} from "@/lib/revenue-intelligence/types";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

export async function ensureRevenueSettings(
  organizationId: string,
): Promise<RevenueOrgSettingsRow> {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("revenue_intel_org_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (existing) return existing as RevenueOrgSettingsRow;

  const { data, error } = await supabase
    .from("revenue_intel_org_settings")
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
      forecast_horizon_months: 12,
      kpi_config_json: {},
      notification_rules_json: {},
      report_schedule_json: {},
      rate_limit_per_minute: 40,
      metadata_json: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
  return data as RevenueOrgSettingsRow;
}

export async function loadRevenueSignals(organizationId: string): Promise<{
  deals: RevenueDealSignal[];
  invoices: RevenueInvoiceSignal[];
  billing: RevenueBillingSignal | null;
  customerCount: number;
}> {
  const supabase = await createClient();

  const [
    { data: deals },
    { data: invoices },
    { data: subscription },
    { count: customerCount },
  ] = await Promise.all([
    supabase
      .from("crm_deals")
      .select(
        "id, title, value, status, probability, expected_close_date, closed_at, owner_user_id, updated_at, created_at",
      )
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false })
      .limit(400),
    supabase
      .from("billing_invoices")
      .select("amount_due_cents, status, paid_at, period_start, period_end")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("billing_subscriptions")
      .select(
        "status, seats_purchased, current_period_end, billing_interval, metadata_json",
      )
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("companies")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "customer"),
  ]);

  let amountHint = 0;
  if (
    subscription?.metadata_json &&
    typeof subscription.metadata_json === "object" &&
    !Array.isArray(subscription.metadata_json)
  ) {
    const meta = subscription.metadata_json as Record<string, unknown>;
    amountHint = Number(meta.mrr_cents ?? meta.amount_cents ?? 0) / 100;
  }

  return {
    deals: (deals ?? []).map((d) => ({
      id: d.id,
      title: d.title,
      value: Number(d.value ?? 0),
      status: d.status,
      probability: d.probability,
      expectedCloseDate: d.expected_close_date,
      closedAt: d.closed_at,
      ownerUserId: d.owner_user_id,
      updatedAt: d.updated_at,
      createdAt: d.created_at,
    })),
    invoices: (invoices ?? []).map((i) => ({
      amountDueCents: i.amount_due_cents,
      status: i.status,
      paidAt: i.paid_at,
      periodStart: i.period_start,
      periodEnd: i.period_end,
    })),
    billing: subscription
      ? {
          status: subscription.status,
          seatsPurchased: subscription.seats_purchased,
          periodEnd: subscription.current_period_end,
          interval: subscription.billing_interval,
          amountHint,
        }
      : null,
    customerCount: customerCount ?? 0,
  };
}

export async function refreshRevenueIntelligence(params: {
  organizationId: string;
  userId?: string | null;
}): Promise<RevenueDashboardStats> {
  const settings = await ensureRevenueSettings(params.organizationId);
  if (!settings.enabled) {
    return emptyDashboard();
  }

  await ensureRevenueIntelligenceAgent(params.organizationId, params.userId);
  const supabase = await createClient();

  const { data: prevSnap } = await supabase
    .from("revenue_intel_snapshots")
    .select("mrr")
    .eq("organization_id", params.organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const signals = await loadRevenueSignals(params.organizationId);
  const kpis = computeRevenueKpis({
    deals: signals.deals,
    invoices: signals.invoices,
    billing: signals.billing,
    customerCount: Math.max(
      signals.customerCount,
      signals.deals.filter((d) => d.status === "won").length,
    ),
    previousMrr: prevSnap ? Number(prevSnap.mrr) : undefined,
  });
  const pipeline = analyzePipeline(signals.deals);
  const forecasts = computeHorizonForecasts(kpis, pipeline);
  const growth = analyzeGrowth(signals.deals, kpis);
  const churn = analyzeRevenueChurn(signals.deals, kpis);
  const expansion = detectExpansion(signals.deals, kpis);
  const insights = buildInsights(kpis, growth, churn, pipeline);
  const recommendations = buildRecommendations(kpis, churn, pipeline);
  const alerts = buildAlerts(
    kpis,
    churn,
    pipeline,
    prevSnap ? Number(prevSnap.mrr) : undefined,
  );

  const periodKey = new Date().toISOString().slice(0, 10);
  await supabase.from("revenue_intel_snapshots").insert({
    organization_id: params.organizationId,
    period_key: periodKey,
    period_type: "month",
    mrr: kpis.mrr,
    arr: kpis.arr,
    acv: kpis.acv,
    arpa: kpis.arpa,
    ltv: kpis.ltv,
    cac: kpis.cac,
    ltv_cac: kpis.ltvCac,
    gross_revenue: kpis.grossRevenue,
    net_revenue: kpis.netRevenue,
    expansion_revenue: kpis.expansionRevenue,
    contraction_revenue: kpis.contractionRevenue,
    retention_rate: kpis.retentionRate,
    nrr: kpis.nrr,
    grr: kpis.grr,
    margin_rate: kpis.marginRate,
    profit: kpis.profit,
    avg_deal_value: kpis.avgDealValue,
    avg_order_value: kpis.avgOrderValue,
    growth_rate: kpis.growthRate,
    customer_count: kpis.customerCount,
    metrics_json: { growth, churn, pipeline, expansion } as unknown as Json,
    ai_confidence: kpis.confidence,
    provider: settings.provider,
    model: settings.model,
    created_by: params.userId ?? null,
  });

  await supabase
    .from("revenue_intel_forecasts")
    .delete()
    .eq("organization_id", params.organizationId)
    .gte("created_at", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString());

  await supabase.from("revenue_intel_forecasts").insert(
    forecasts.map((f) => ({
      organization_id: params.organizationId,
      horizon: f.horizon,
      forecast_revenue: f.forecastRevenue,
      pipeline_open: f.pipeline.openPipeline,
      pipeline_weighted: f.pipeline.weightedPipeline,
      likely_revenue: f.pipeline.likelyRevenue,
      risk_revenue: f.pipeline.riskRevenue,
      missed_revenue: f.pipeline.missedRevenue,
      expected_closings: f.pipeline.expectedClosings,
      confidence: f.confidence,
      breakdown_json: f as unknown as Json,
      created_by: params.userId ?? null,
    })),
  );

  await supabase
    .from("revenue_intel_insights")
    .delete()
    .eq("organization_id", params.organizationId);
  await supabase.from("revenue_intel_insights").insert(
    insights.map((i) => ({
      organization_id: params.organizationId,
      insight_type: i.type,
      title: i.title,
      body: i.body,
      severity: i.severity,
      priority: i.priority,
    })),
  );

  await supabase
    .from("revenue_intel_recommendations")
    .delete()
    .eq("organization_id", params.organizationId)
    .eq("status", "open");
  await supabase.from("revenue_intel_recommendations").insert(
    recommendations.map((r) => ({
      organization_id: params.organizationId,
      recommendation_type: r.type,
      title: r.title,
      rationale: r.rationale,
      priority: r.priority,
      status: "open",
    })),
  );

  await supabase
    .from("revenue_intel_alerts")
    .delete()
    .eq("organization_id", params.organizationId)
    .eq("status", "open");
  if (alerts.length) {
    await supabase.from("revenue_intel_alerts").insert(
      alerts.map((a) => ({
        organization_id: params.organizationId,
        alert_type: a.type,
        severity: a.severity,
        title: a.title,
        message: a.message,
        status: "open",
      })),
    );
  }

  await logRevenueEvent({
    organizationId: params.organizationId,
    eventType: "intelligence.refreshed",
    summary: `Revenue refresh — MRR €${kpis.mrr}, ARR €${kpis.arr}`,
    actorUserId: params.userId,
    payload: { mrr: kpis.mrr, arr: kpis.arr },
    provider: settings.provider,
    model: settings.model,
  });

  await emitAiEvent({
    organizationId: params.organizationId,
    eventType: "workflow.finished",
    payload: { kind: "revenue_intelligence_refresh", mrr: kpis.mrr },
  });

  return {
    kpis,
    forecasts,
    pipeline,
    growth,
    churn,
    expansion,
    insights,
    recommendations,
    alerts,
    executiveSummary: executiveSummary(kpis, insights),
  };
}

function emptyDashboard(): RevenueDashboardStats {
  const kpis = computeRevenueKpis({
    deals: [],
    invoices: [],
    billing: null,
    customerCount: 0,
  });
  const pipeline = analyzePipeline([]);
  return {
    kpis,
    forecasts: computeHorizonForecasts(kpis, pipeline),
    pipeline,
    growth: analyzeGrowth([], kpis),
    churn: analyzeRevenueChurn([], kpis),
    expansion: [],
    insights: [],
    recommendations: [],
    alerts: [],
    executiveSummary: "Agent disabled or no data.",
  };
}

export async function getRevenueDashboard(
  organizationId: string,
): Promise<RevenueDashboardStats> {
  const supabase = await createClient();
  const { data: snap } = await supabase
    .from("revenue_intel_snapshots")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!snap) {
    return refreshRevenueIntelligence({ organizationId });
  }

  const [{ data: forecastRows }, { data: insightRows }, { data: recRows }, { data: alertRows }] =
    await Promise.all([
      supabase
        .from("revenue_intel_forecasts")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("revenue_intel_insights")
        .select("*")
        .eq("organization_id", organizationId)
        .order("priority", { ascending: false })
        .limit(12),
      supabase
        .from("revenue_intel_recommendations")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("status", "open")
        .order("priority", { ascending: false })
        .limit(12),
      supabase
        .from("revenue_intel_alerts")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(12),
    ]);

  const metrics =
    snap.metrics_json &&
    typeof snap.metrics_json === "object" &&
    !Array.isArray(snap.metrics_json)
      ? (snap.metrics_json as Record<string, unknown>)
      : {};

  const kpis = {
    mrr: Number(snap.mrr),
    arr: Number(snap.arr),
    acv: Number(snap.acv),
    arpa: Number(snap.arpa),
    ltv: Number(snap.ltv),
    cac: Number(snap.cac),
    ltvCac: Number(snap.ltv_cac),
    grossRevenue: Number(snap.gross_revenue),
    netRevenue: Number(snap.net_revenue),
    expansionRevenue: Number(snap.expansion_revenue),
    contractionRevenue: Number(snap.contraction_revenue),
    retentionRate: Number(snap.retention_rate),
    nrr: Number(snap.nrr),
    grr: Number(snap.grr),
    marginRate: Number(snap.margin_rate),
    profit: Number(snap.profit),
    avgDealValue: Number(snap.avg_deal_value),
    avgOrderValue: Number(snap.avg_order_value),
    growthRate: Number(snap.growth_rate),
    customerCount: snap.customer_count,
    confidence: Number(snap.ai_confidence),
  };

  const pipeline =
    (metrics.pipeline as RevenueDashboardStats["pipeline"]) ??
    analyzePipeline([]);
  const growth =
    (metrics.growth as RevenueDashboardStats["growth"]) ??
    analyzeGrowth([], kpis);
  const churn =
    (metrics.churn as RevenueDashboardStats["churn"]) ??
    analyzeRevenueChurn([], kpis);
  const expansion =
    (metrics.expansion as RevenueDashboardStats["expansion"]) ?? [];

  const seenHorizons = new Set<string>();
  const forecasts = (forecastRows ?? [])
    .filter((f) => {
      if (seenHorizons.has(f.horizon)) return false;
      seenHorizons.add(f.horizon);
      return true;
    })
    .map((f) => ({
      horizon: f.horizon as RevenueDashboardStats["forecasts"][number]["horizon"],
      forecastRevenue: Number(f.forecast_revenue),
      confidence: Number(f.confidence),
      pipeline: {
        openPipeline: Number(f.pipeline_open),
        weightedPipeline: Number(f.pipeline_weighted),
        likelyRevenue: Number(f.likely_revenue),
        riskRevenue: Number(f.risk_revenue),
        missedRevenue: Number(f.missed_revenue),
        expectedClosings: f.expected_closings,
      },
    }));

  const insights = (insightRows ?? []).map((i) => ({
    type: i.insight_type,
    title: i.title,
    body: i.body,
    severity: i.severity as RevenueDashboardStats["insights"][number]["severity"],
    priority: i.priority,
  }));

  return {
    kpis,
    forecasts:
      forecasts.length > 0 ? forecasts : computeHorizonForecasts(kpis, pipeline),
    pipeline,
    growth,
    churn,
    expansion,
    insights,
    recommendations: (recRows ?? []).map((r) => ({
      type: r.recommendation_type as RevenueDashboardStats["recommendations"][number]["type"],
      title: r.title,
      rationale: r.rationale,
      priority: r.priority,
    })),
    alerts: (alertRows ?? []).map((a) => ({
      type: a.alert_type as RevenueDashboardStats["alerts"][number]["type"],
      severity: a.severity as RevenueDashboardStats["alerts"][number]["severity"],
      title: a.title,
      message: a.message,
    })),
    executiveSummary: executiveSummary(kpis, insights),
  };
}

export async function persistScenario(params: {
  organizationId: string;
  userId?: string | null;
  scenarioType: ScenarioType;
}) {
  const settings = await ensureRevenueSettings(params.organizationId);
  const dash = await getRevenueDashboard(params.organizationId);
  const result = runScenario(params.scenarioType, dash.kpis);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("revenue_intel_scenarios")
    .insert({
      organization_id: params.organizationId,
      name: result.name,
      scenario_type: result.type,
      assumptions_json: result.assumptions as Json,
      impact_json: result.impact as Json,
      delta_mrr: result.deltaMrr,
      delta_arr: result.deltaArr,
      delta_profit: result.deltaProfit,
      created_by: params.userId ?? null,
    })
    .select("id")
    .single();

  await logRevenueEvent({
    organizationId: params.organizationId,
    eventType: "scenario.created",
    summary: `Scenario ${result.name}: ΔMRR €${result.deltaMrr}`,
    actorUserId: params.userId,
    provider: settings.provider,
    model: settings.model,
  });

  if (error) throw new Error(error.message);
  return { id: data.id, result };
}

export async function persistReports(params: {
  organizationId: string;
  userId?: string | null;
  types?: ReportType[];
}) {
  const settings = await ensureRevenueSettings(params.organizationId);
  const dash = await getRevenueDashboard(params.organizationId);
  const types = params.types ?? [
    "ceo",
    "board",
    "investor",
    "finance",
    "growth",
    "forecast",
  ];
  const supabase = await createClient();
  const ids: string[] = [];

  for (const type of types) {
    const report = buildExecutiveReport(
      type,
      dash.kpis,
      dash.insights,
      dash.forecasts,
    );
    const { data } = await supabase
      .from("revenue_intel_reports")
      .insert({
        organization_id: params.organizationId,
        report_type: report.type,
        title: report.title,
        format: "pptx_ready",
        body_markdown: report.bodyMarkdown,
        sections_json: report.sections as unknown as Json,
        created_by: params.userId ?? null,
      })
      .select("id")
      .single();
    if (data?.id) ids.push(data.id);
  }

  await logRevenueEvent({
    organizationId: params.organizationId,
    eventType: "reports.generated",
    summary: `Generated ${ids.length} executive reports`,
    actorUserId: params.userId,
    provider: settings.provider,
    model: settings.model,
  });

  return ids;
}
