/**
 * Phase 27C — AI Sales Agent constants (client-safe).
 */

export const SALES_AGENT_SLUG = "storaflow-sales-agent";
export const SALES_AGENT_VERSION = "1.0.0";

export const RISK_LEVELS = ["low", "medium", "high", "critical"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const NEXT_BEST_ACTIONS = [
  "call",
  "plan_demo",
  "send_quote",
  "send_reminder",
  "book_meeting",
  "ask_feedback",
  "escalate",
  "wait",
  "send_email",
  "follow_up",
] as const;

export type NextBestAction = (typeof NEXT_BEST_ACTIONS)[number];

export const NEXT_BEST_ACTION_LABELS: Record<NextBestAction, string> = {
  call: "Bel klant",
  plan_demo: "Plan demo",
  send_quote: "Stuur offerte",
  send_reminder: "Stuur herinnering",
  book_meeting: "Maak afspraak",
  ask_feedback: "Vraag feedback",
  escalate: "Escaleren",
  wait: "Wachten",
  send_email: "Stuur e-mail",
  follow_up: "Follow-up",
};

export const EMAIL_TEMPLATE_TYPES = [
  "introduction",
  "follow_up",
  "thank_you",
  "quote",
  "reminder",
  "demo_invite",
  "contract",
  "rejection",
  "upsell",
  "cross_sell",
] as const;

export type EmailTemplateType = (typeof EMAIL_TEMPLATE_TYPES)[number];

export const EMAIL_TEMPLATE_LABELS: Record<EmailTemplateType, string> = {
  introduction: "Introductie",
  follow_up: "Follow-up",
  thank_you: "Bedankmail",
  quote: "Offerte",
  reminder: "Herinnering",
  demo_invite: "Demo uitnodiging",
  contract: "Contractmail",
  rejection: "Afwijzing",
  upsell: "Upsell",
  cross_sell: "Cross-sell",
};

export const SALES_OPPORTUNITY_CODES = [
  "upsell",
  "cross_sell",
  "renewal",
  "extra_location",
  "new_products",
  "new_contacts",
  "new_decision_makers",
] as const;

export type SalesOpportunityCode = (typeof SALES_OPPORTUNITY_CODES)[number];

export const SALES_OPPORTUNITY_LABELS: Record<SalesOpportunityCode, string> = {
  upsell: "Upsell",
  cross_sell: "Cross-sell",
  renewal: "Renewal",
  extra_location: "Extra vestiging",
  new_products: "Nieuwe producten",
  new_contacts: "Nieuwe contactpersonen",
  new_decision_makers: "Nieuwe beslissers",
};

export const SALES_UI = {
  hubTitle: "AI Sales",
  overviewTitle: "Overview",
  prioritiesTitle: "Today's Priorities",
  dealsTitle: "Deals",
  pipelineTitle: "Pipeline",
  activitiesTitle: "Activities",
  meetingsTitle: "Meetings",
  forecastTitle: "Forecast",
  insightsTitle: "Insights",
  recommendationsTitle: "Recommendations",
  historyTitle: "History",
  settingsTitle: "Settings",
} as const;

export const SALES_NAV = [
  { href: "/sales", label: SALES_UI.overviewTitle },
  { href: "/sales/priorities", label: SALES_UI.prioritiesTitle },
  { href: "/sales/deals", label: SALES_UI.dealsTitle },
  { href: "/sales/pipeline", label: SALES_UI.pipelineTitle },
  { href: "/sales/activities", label: SALES_UI.activitiesTitle },
  { href: "/sales/meetings", label: SALES_UI.meetingsTitle },
  { href: "/sales/forecast", label: SALES_UI.forecastTitle },
  { href: "/sales/insights", label: SALES_UI.insightsTitle },
  { href: "/sales/recommendations", label: SALES_UI.recommendationsTitle },
  { href: "/sales/history", label: SALES_UI.historyTitle },
  { href: "/sales/settings", label: SALES_UI.settingsTitle },
] as const;
