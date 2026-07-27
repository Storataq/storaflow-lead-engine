/**
 * Phase 27F — AI Customer Success Agent constants (client-safe).
 */

export const CS_AGENT_SLUG = "storaflow-customer-success-agent";
export const CS_AGENT_VERSION = "1.0.0";

export const HEALTH_CLASSES = [
  "excellent",
  "healthy",
  "stable",
  "needs_attention",
  "critical",
  "at_risk",
] as const;

export type HealthClass = (typeof HEALTH_CLASSES)[number];

export const HEALTH_CLASS_LABELS: Record<HealthClass, string> = {
  excellent: "Excellent",
  healthy: "Healthy",
  stable: "Stable",
  needs_attention: "Needs Attention",
  critical: "Critical",
  at_risk: "At Risk",
};

export const CS_RECOMMENDATION_TYPES = [
  "schedule_review",
  "call_customer",
  "send_guide",
  "demo_feature",
  "schedule_training",
  "renewal_talk",
  "upsell_offer",
  "offer_support",
  "complete_onboarding",
  "reduce_churn",
] as const;

export type CsRecommendationType = (typeof CS_RECOMMENDATION_TYPES)[number];

export const CS_RECOMMENDATION_LABELS: Record<CsRecommendationType, string> = {
  schedule_review: "Plan evaluatie",
  call_customer: "Bel klant",
  send_guide: "Stuur handleiding",
  demo_feature: "Demo nieuwe feature",
  schedule_training: "Plan training",
  renewal_talk: "Renewal gesprek",
  upsell_offer: "Upsell voorstel",
  offer_support: "Support aanbieden",
  complete_onboarding: "Onboarding afronden",
  reduce_churn: "Churn reduceren",
};

export const UPSELL_OPPORTUNITIES = [
  "more_users",
  "ai_credits",
  "enterprise",
  "extra_modules",
  "new_integrations",
  "white_label",
  "api",
  "premium_support",
] as const;

export type UpsellOpportunity = (typeof UPSELL_OPPORTUNITIES)[number];

export const UPSELL_LABELS: Record<UpsellOpportunity, string> = {
  more_users: "Meer gebruikers",
  ai_credits: "Extra AI Credits",
  enterprise: "Enterprise",
  extra_modules: "Extra modules",
  new_integrations: "Nieuwe integraties",
  white_label: "White Label",
  api: "API",
  premium_support: "Premium Support",
};

export const CROSS_SELL_PRODUCTS = [
  "storataq",
  "storahr",
  "storafinance",
  "storaprojects",
  "storaroute",
  "storainsight",
] as const;

export type CrossSellProduct = (typeof CROSS_SELL_PRODUCTS)[number];

export const CROSS_SELL_LABELS: Record<CrossSellProduct, string> = {
  storataq: "StorataQ",
  storahr: "StoraHR",
  storafinance: "StoraFinance",
  storaprojects: "StoraProjects",
  storaroute: "StoraRoute",
  storainsight: "StoraInsight",
};

export const CS_UI = {
  hubTitle: "AI Customer Success",
  overviewTitle: "Overview",
  customersTitle: "Customers",
  healthTitle: "Health Scores",
  plansTitle: "Success Plans",
  renewalsTitle: "Renewals",
  onboardingTitle: "Onboarding",
  churnTitle: "Churn Risk",
  upsellTitle: "Upsell",
  recommendationsTitle: "Recommendations",
  historyTitle: "History",
  settingsTitle: "Settings",
} as const;

export const CS_NAV = [
  { href: "/customer-success", label: CS_UI.overviewTitle },
  { href: "/customer-success/customers", label: CS_UI.customersTitle },
  { href: "/customer-success/health", label: CS_UI.healthTitle },
  { href: "/customer-success/plans", label: CS_UI.plansTitle },
  { href: "/customer-success/renewals", label: CS_UI.renewalsTitle },
  { href: "/customer-success/onboarding", label: CS_UI.onboardingTitle },
  { href: "/customer-success/churn", label: CS_UI.churnTitle },
  { href: "/customer-success/upsell", label: CS_UI.upsellTitle },
  { href: "/customer-success/recommendations", label: CS_UI.recommendationsTitle },
  { href: "/customer-success/history", label: CS_UI.historyTitle },
  { href: "/customer-success/settings", label: CS_UI.settingsTitle },
] as const;
