/**
 * Phase 27G — AI Revenue Intelligence Agent constants (client-safe).
 */

export const REVENUE_AGENT_SLUG = "storaflow-revenue-intelligence-agent";
export const REVENUE_AGENT_VERSION = "1.0.0";

export const FORECAST_HORIZONS = [
  "week",
  "month",
  "quarter",
  "year",
  "three_year",
  "five_year",
] as const;

export type ForecastHorizon = (typeof FORECAST_HORIZONS)[number];

export const FORECAST_HORIZON_LABELS: Record<ForecastHorizon, string> = {
  week: "Deze week",
  month: "Deze maand",
  quarter: "Komend kwartaal",
  year: "Komend jaar",
  three_year: "Drie jaar",
  five_year: "Vijf jaar",
};

export const SCENARIO_TYPES = [
  "more_customers",
  "less_churn",
  "price_increase",
  "extra_sales_hire",
  "new_market",
  "new_product",
  "new_ai_agent",
  "custom",
] as const;

export type ScenarioType = (typeof SCENARIO_TYPES)[number];

export const SCENARIO_TYPE_LABELS: Record<ScenarioType, string> = {
  more_customers: "10% meer klanten",
  less_churn: "20% minder churn",
  price_increase: "Prijsverhoging",
  extra_sales_hire: "Extra Sales medewerker",
  new_market: "Nieuwe markt",
  new_product: "Nieuw product",
  new_ai_agent: "Nieuwe AI Agent",
  custom: "Custom",
};

export const REPORT_TYPES = [
  "ceo",
  "board",
  "investor",
  "finance",
  "growth",
  "forecast",
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  ceo: "CEO Report",
  board: "Board Report",
  investor: "Investor Report",
  finance: "Finance Report",
  growth: "Growth Report",
  forecast: "Forecast Report",
};

export const REVENUE_REC_TYPES = [
  "invest_more",
  "more_sales",
  "more_marketing",
  "pricing",
  "new_audience",
  "new_region",
  "new_campaign",
  "new_ai_workflow",
  "reduce_churn",
  "expand_enterprise",
  "focus_segment",
] as const;

export type RevenueRecType = (typeof REVENUE_REC_TYPES)[number];

export const REVENUE_REC_LABELS: Record<RevenueRecType, string> = {
  invest_more: "Meer investeren",
  more_sales: "Meer sales",
  more_marketing: "Meer marketing",
  pricing: "Nieuwe prijsstrategie",
  new_audience: "Nieuwe doelgroep",
  new_region: "Nieuwe regio",
  new_campaign: "Nieuwe campagne",
  new_ai_workflow: "Nieuwe AI workflow",
  reduce_churn: "Minder churn",
  expand_enterprise: "Focus op Enterprise",
  focus_segment: "Focus segment",
};

export const REVENUE_UI = {
  hubTitle: "AI Revenue Intelligence",
  overviewTitle: "Overview",
  revenueTitle: "Revenue",
  forecastTitle: "Forecast",
  pipelineTitle: "Pipeline",
  customersTitle: "Customers",
  growthTitle: "Growth",
  mrrTitle: "MRR",
  arrTitle: "ARR",
  churnTitle: "Churn",
  expansionTitle: "Expansion",
  reportsTitle: "Reports",
  insightsTitle: "Insights",
  historyTitle: "History",
  settingsTitle: "Settings",
} as const;

export const REVENUE_NAV = [
  { href: "/revenue", label: REVENUE_UI.overviewTitle },
  { href: "/revenue/revenue", label: REVENUE_UI.revenueTitle },
  { href: "/revenue/forecast", label: REVENUE_UI.forecastTitle },
  { href: "/revenue/pipeline", label: REVENUE_UI.pipelineTitle },
  { href: "/revenue/customers", label: REVENUE_UI.customersTitle },
  { href: "/revenue/growth", label: REVENUE_UI.growthTitle },
  { href: "/revenue/mrr", label: REVENUE_UI.mrrTitle },
  { href: "/revenue/arr", label: REVENUE_UI.arrTitle },
  { href: "/revenue/churn", label: REVENUE_UI.churnTitle },
  { href: "/revenue/expansion", label: REVENUE_UI.expansionTitle },
  { href: "/revenue/reports", label: REVENUE_UI.reportsTitle },
  { href: "/revenue/insights", label: REVENUE_UI.insightsTitle },
  { href: "/revenue/history", label: REVENUE_UI.historyTitle },
  { href: "/revenue/settings", label: REVENUE_UI.settingsTitle },
] as const;
