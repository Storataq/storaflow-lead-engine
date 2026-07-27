/**
 * Phase 27F — AI Customer Success Agent public barrel (client-safe).
 */

export {
  CS_AGENT_SLUG,
  CS_AGENT_VERSION,
  HEALTH_CLASSES,
  HEALTH_CLASS_LABELS,
  CS_RECOMMENDATION_TYPES,
  CS_RECOMMENDATION_LABELS,
  UPSELL_OPPORTUNITIES,
  UPSELL_LABELS,
  CROSS_SELL_PRODUCTS,
  CROSS_SELL_LABELS,
  CS_UI,
  CS_NAV,
} from "@/lib/customer-success/constants";

export type {
  HealthClass,
  CsRecommendationType,
  UpsellOpportunity,
  CrossSellProduct,
} from "@/lib/customer-success/constants";

export {
  computeHealthScore,
  classifyHealth,
  parseHealthWeights,
  DEFAULT_HEALTH_WEIGHTS,
} from "@/lib/customer-success/health";

export { predictChurn } from "@/lib/customer-success/churn";
export { analyzeRenewal } from "@/lib/customer-success/renewal";
export {
  buildOnboardingChecklist,
  buildSuccessPlan,
} from "@/lib/customer-success/onboarding";
export {
  detectUpsell,
  detectCrossSell,
  buildInsights,
  buildCustomerRecommendations,
  buildAlerts,
} from "@/lib/customer-success/insights";
