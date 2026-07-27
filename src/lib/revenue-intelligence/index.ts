/**
 * Phase 27G — AI Revenue Intelligence public barrel (client-safe).
 */

export {
  REVENUE_AGENT_SLUG,
  REVENUE_AGENT_VERSION,
  FORECAST_HORIZONS,
  FORECAST_HORIZON_LABELS,
  SCENARIO_TYPES,
  SCENARIO_TYPE_LABELS,
  REPORT_TYPES,
  REPORT_TYPE_LABELS,
  REVENUE_REC_TYPES,
  REVENUE_REC_LABELS,
  REVENUE_UI,
  REVENUE_NAV,
} from "@/lib/revenue-intelligence/constants";

export type {
  ForecastHorizon,
  ScenarioType,
  ReportType,
  RevenueRecType,
} from "@/lib/revenue-intelligence/constants";

export { computeRevenueKpis } from "@/lib/revenue-intelligence/kpis";
export {
  analyzePipeline,
  computeHorizonForecasts,
} from "@/lib/revenue-intelligence/forecast";
export {
  analyzeGrowth,
  analyzeRevenueChurn,
  detectExpansion,
  runScenario,
  buildInsights,
  buildRecommendations,
  buildAlerts,
  buildExecutiveReport,
} from "@/lib/revenue-intelligence/insights";
