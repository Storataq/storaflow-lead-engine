/**
 * Phase 27G — Revenue Intelligence shared types.
 */

import type {
  ForecastHorizon,
  ReportType,
  RevenueRecType,
  ScenarioType,
} from "@/lib/revenue-intelligence/constants";
import type { Json } from "@/types/supabase";

export type RevenueOrgSettingsRow = {
  organization_id: string;
  enabled: boolean;
  approval_mode: string;
  provider: string;
  model: string;
  forecast_horizon_months: number;
  kpi_config_json: Json;
  notification_rules_json: Json;
  report_schedule_json: Json;
  rate_limit_per_minute: number;
  metadata_json: Json;
  created_at: string;
  updated_at: string;
};

export type RevenueSnapshotRow = {
  id: string;
  organization_id: string;
  period_key: string;
  period_type: string;
  mrr: number;
  arr: number;
  acv: number;
  arpa: number;
  ltv: number;
  cac: number;
  ltv_cac: number;
  gross_revenue: number;
  net_revenue: number;
  expansion_revenue: number;
  contraction_revenue: number;
  retention_rate: number;
  nrr: number;
  grr: number;
  margin_rate: number;
  profit: number;
  avg_deal_value: number;
  avg_order_value: number;
  growth_rate: number;
  customer_count: number;
  metrics_json: Json;
  filters_json: Json;
  ai_confidence: number;
  provider: string | null;
  model: string | null;
  created_by: string | null;
  created_at: string;
};

export type RevenueForecastRow = {
  id: string;
  organization_id: string;
  horizon: string;
  forecast_revenue: number;
  pipeline_open: number;
  pipeline_weighted: number;
  likely_revenue: number;
  risk_revenue: number;
  missed_revenue: number;
  expected_closings: number;
  confidence: number;
  breakdown_json: Json;
  created_by: string | null;
  created_at: string;
};

export type RevenueScenarioRow = {
  id: string;
  organization_id: string;
  name: string;
  scenario_type: string;
  assumptions_json: Json;
  impact_json: Json;
  delta_mrr: number;
  delta_arr: number;
  delta_profit: number;
  created_by: string | null;
  created_at: string;
};

export type RevenueInsightRow = {
  id: string;
  organization_id: string;
  insight_type: string;
  title: string;
  body: string;
  severity: string;
  priority: number;
  payload_json: Json;
  created_at: string;
};

export type RevenueRecommendationRow = {
  id: string;
  organization_id: string;
  recommendation_type: string;
  title: string;
  rationale: string;
  priority: number;
  status: string;
  payload_json: Json;
  created_at: string;
};

export type RevenueAlertRow = {
  id: string;
  organization_id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  status: string;
  payload_json: Json;
  created_at: string;
};

export type RevenueReportRow = {
  id: string;
  organization_id: string;
  report_type: string;
  title: string;
  format: string;
  body_markdown: string;
  sections_json: Json;
  created_by: string | null;
  created_at: string;
};

export type RevenueHistoryEventRow = {
  id: string;
  organization_id: string;
  event_type: string;
  actor_user_id: string | null;
  summary: string;
  payload_json: Json;
  provider: string | null;
  model: string | null;
  cost_usd: number;
  created_at: string;
};

export type RevenueDealSignal = {
  id: string;
  title: string;
  value: number;
  status: string;
  probability: number | null;
  expectedCloseDate: string | null;
  closedAt: string | null;
  ownerUserId: string | null;
  updatedAt: string;
  createdAt: string;
};

export type RevenueBillingSignal = {
  status: string;
  seatsPurchased: number;
  periodEnd: string | null;
  interval: string;
  amountHint: number;
};

export type RevenueInvoiceSignal = {
  amountDueCents: number;
  status: string;
  paidAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
};

export type RevenueKpiBundle = {
  mrr: number;
  arr: number;
  acv: number;
  arpa: number;
  ltv: number;
  cac: number;
  ltvCac: number;
  grossRevenue: number;
  netRevenue: number;
  expansionRevenue: number;
  contractionRevenue: number;
  retentionRate: number;
  nrr: number;
  grr: number;
  marginRate: number;
  profit: number;
  avgDealValue: number;
  avgOrderValue: number;
  growthRate: number;
  customerCount: number;
  confidence: number;
};

export type PipelineForecast = {
  openPipeline: number;
  weightedPipeline: number;
  likelyRevenue: number;
  riskRevenue: number;
  missedRevenue: number;
  expectedClosings: number;
};

export type HorizonForecast = {
  horizon: ForecastHorizon;
  forecastRevenue: number;
  confidence: number;
  pipeline: PipelineForecast;
};

export type GrowthMetrics = {
  newCustomers: number;
  newRevenue: number;
  recurringRevenue: number;
  upsellRevenue: number;
  crossSellRevenue: number;
  renewals: number;
  growthRate: number;
};

export type ChurnMetrics = {
  customerChurnRate: number;
  revenueChurnRate: number;
  logoChurn: number;
  expectedChurnRevenue: number;
  impact: string;
  confidence: number;
};

export type ExpansionOpportunity = {
  code: string;
  label: string;
  rationale: string;
  potentialRevenue: number;
};

export type ScenarioResult = {
  type: ScenarioType;
  name: string;
  assumptions: Record<string, number>;
  deltaMrr: number;
  deltaArr: number;
  deltaProfit: number;
  impact: Record<string, unknown>;
};

export type RevenueInsight = {
  type: string;
  title: string;
  body: string;
  severity: "info" | "positive" | "warning" | "critical";
  priority: number;
};

export type RevenueRecommendation = {
  type: RevenueRecType;
  title: string;
  rationale: string;
  priority: number;
};

export type RevenueAlert = {
  type:
    | "revenue_down"
    | "mrr_down"
    | "pipeline_risk"
    | "forecast_deviation"
    | "high_churn"
    | "low_conversion"
    | "negative_trend";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  message: string;
};

export type ExecutiveReport = {
  type: ReportType;
  title: string;
  bodyMarkdown: string;
  sections: Array<{ heading: string; body: string }>;
};

export type RevenueFilters = {
  period?: string;
  country?: string;
  industry?: string;
  ownerUserId?: string;
  minConfidence?: number;
};

export type RevenueDashboardStats = {
  kpis: RevenueKpiBundle;
  forecasts: HorizonForecast[];
  pipeline: PipelineForecast;
  growth: GrowthMetrics;
  churn: ChurnMetrics;
  expansion: ExpansionOpportunity[];
  insights: RevenueInsight[];
  recommendations: RevenueRecommendation[];
  alerts: RevenueAlert[];
  executiveSummary: string;
};
