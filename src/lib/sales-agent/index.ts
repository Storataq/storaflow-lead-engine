/**
 * Phase 27C — AI Sales Agent public barrel (client-safe).
 */

export {
  SALES_AGENT_SLUG,
  SALES_AGENT_VERSION,
  RISK_LEVELS,
  RISK_LEVEL_LABELS,
  NEXT_BEST_ACTIONS,
  NEXT_BEST_ACTION_LABELS,
  EMAIL_TEMPLATE_TYPES,
  EMAIL_TEMPLATE_LABELS,
  SALES_OPPORTUNITY_CODES,
  SALES_OPPORTUNITY_LABELS,
  SALES_UI,
  SALES_NAV,
} from "@/lib/sales-agent/constants";

export type {
  RiskLevel,
  NextBestAction,
  EmailTemplateType,
  SalesOpportunityCode,
} from "@/lib/sales-agent/constants";

export {
  computeRiskScore,
  computePriorityScore,
  computeClosingProbability,
  chooseNextBestAction,
  predictCloseDate,
} from "@/lib/sales-agent/priority";

export { analyzeDeal, detectSalesOpportunities, buildCoachTips } from "@/lib/sales-agent/analysis";

export { analyzePipelineHealth, computeForecast } from "@/lib/sales-agent/forecast";

export {
  generateEmailDraft,
  buildMeetingBrief,
  buildMeetingSummary,
  emailTemplateOptions,
} from "@/lib/sales-agent/comms";
