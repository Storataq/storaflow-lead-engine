/**
 * Phase 26F — Billing constants (label catalog = i18n pattern).
 */

export const BILLING_PLAN_TIERS = [
  "free_trial",
  "starter",
  "professional",
  "business",
  "enterprise",
  "white_label",
] as const;

export type BillingPlanTier = (typeof BILLING_PLAN_TIERS)[number];

export const BILLING_PLAN_TIER_LABELS: Record<BillingPlanTier, string> = {
  free_trial: "Free Trial",
  starter: "Starter",
  professional: "Professional",
  business: "Business",
  enterprise: "Enterprise",
  white_label: "White Label",
};

export const BILLING_INTERVALS = ["month", "year", "custom"] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

export const BILLING_INTERVAL_LABELS: Record<BillingInterval, string> = {
  month: "Monthly",
  year: "Yearly",
  custom: "Custom",
};

export const SUBSCRIPTION_STATUSES = [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "paused",
  "incomplete",
] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  trialing: "Trial",
  active: "Active",
  past_due: "Past due",
  canceled: "Canceled",
  unpaid: "Unpaid",
  paused: "Paused",
  incomplete: "Incomplete",
};

export const BILLING_LIMIT_KEYS = [
  "max_users",
  "max_companies",
  "max_contacts",
  "max_campaigns",
  "max_ai_requests",
  "max_api_calls",
  "max_automations",
  "max_storage_mb",
] as const;

export type BillingLimitKey = (typeof BILLING_LIMIT_KEYS)[number];

export const BILLING_LIMIT_LABELS: Record<BillingLimitKey, string> = {
  max_users: "Users",
  max_companies: "Companies",
  max_contacts: "Contacts",
  max_campaigns: "Campaigns",
  max_ai_requests: "AI requests",
  max_api_calls: "API calls",
  max_automations: "Automations",
  max_storage_mb: "Storage (MB)",
};

export const BILLING_FEATURE_KEYS = [
  "marketplace",
  "copilot",
  "analytics",
  "white_label",
  "api_access",
  "priority_support",
  "automations",
] as const;

export type BillingFeatureKey = (typeof BILLING_FEATURE_KEYS)[number];

export const BILLING_FEATURE_LABELS: Record<BillingFeatureKey, string> = {
  marketplace: "Marketplace access",
  copilot: "AI Copilot",
  analytics: "Analytics",
  white_label: "White Label",
  api_access: "API access",
  priority_support: "Priority support",
  automations: "Automations",
};

export const BILLING_NOTIFICATION_TYPES = [
  "trial_ending",
  "payment_failed",
  "invoice_available",
  "subscription_renewed",
  "subscription_cancelled",
  "plan_upgraded",
  "usage_limit_warning",
] as const;

export const BILLING_NOTIFICATION_TYPE_LABELS: Record<
  (typeof BILLING_NOTIFICATION_TYPES)[number],
  string
> = {
  trial_ending: "Trial ending",
  payment_failed: "Payment failed",
  invoice_available: "Invoice available",
  subscription_renewed: "Subscription renewed",
  subscription_cancelled: "Subscription cancelled",
  plan_upgraded: "Plan upgraded",
  usage_limit_warning: "Usage limit warning",
};

export const BILLING_UI = {
  hubTitle: "Billing",
  hubDescription:
    "Plans, trials, seats, usage, invoices, and upgrades — org-scoped SaaS billing.",
  dashboardTitle: "Billing dashboard",
  plansTitle: "Plans",
  usageTitle: "Usage",
  invoicesTitle: "Invoices",
  seatsTitle: "Seats",
  addonsTitle: "Add-ons",
  portalTitle: "Billing portal",
  currentPlan: "Current plan",
  billingCycle: "Billing cycle",
  renewalDate: "Renewal date",
  upgrade: "Upgrade",
  downgrade: "Schedule downgrade",
  startTrial: "Start free trial",
  convertTrial: "Convert trial",
  managePayment: "Manage payment method",
  openCustomerPortal: "Open Stripe customer portal",
  emptyInvoices: "No invoices yet.",
  emptyPlans: "No plans available.",
  limitWarning: "Approaching plan limit",
  limitReached: "Plan limit reached",
  softLimit: "Soft limit — upgrade recommended",
  hardLimit: "Hard limit — action blocked",
  futureUsageBilling: "Usage-based billing — ready",
  futureFloatingSeats: "Floating seats — ready",
  futureApplePay: "Apple Pay / Google Pay — ready",
} as const;
