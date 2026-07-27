/**
 * Phase 26F — Billing public surface (client-safe).
 */

export {
  BILLING_PLAN_TIERS,
  BILLING_PLAN_TIER_LABELS,
  BILLING_INTERVAL_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  BILLING_LIMIT_KEYS,
  BILLING_LIMIT_LABELS,
  BILLING_FEATURE_KEYS,
  BILLING_FEATURE_LABELS,
  BILLING_NOTIFICATION_TYPE_LABELS,
  BILLING_UI,
} from "@/lib/billing/constants";

export {
  checkLimit,
  checkFeature,
  trialRemainingDays,
  isWithinGracePeriod,
} from "@/lib/billing/limit-engine";

export {
  isStripeConfigured,
  createCheckoutSessionScaffold,
  createCustomerPortalScaffold,
} from "@/lib/billing/stripe";
