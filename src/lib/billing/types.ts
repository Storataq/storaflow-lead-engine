import type { Database } from "@/types/supabase";
import type {
  BillingFeatureKey,
  BillingLimitKey,
} from "@/lib/billing/constants";
import type { LimitDefinition } from "@/lib/billing/limit-engine";

export type BillingPlanRow =
  Database["public"]["Tables"]["billing_plans"]["Row"];
export type BillingSubscriptionRow =
  Database["public"]["Tables"]["billing_subscriptions"]["Row"];
export type BillingInvoiceRow =
  Database["public"]["Tables"]["billing_invoices"]["Row"];
export type BillingAddonRow =
  Database["public"]["Tables"]["billing_addons"]["Row"];
export type BillingNotificationRow =
  Database["public"]["Tables"]["billing_notifications"]["Row"];
export type BillingPaymentMethodRow =
  Database["public"]["Tables"]["billing_payment_methods"]["Row"];
export type BillingCustomerRow =
  Database["public"]["Tables"]["billing_customers"]["Row"];
export type BillingSeatLedgerRow =
  Database["public"]["Tables"]["billing_seat_ledger"]["Row"];

export type PlanLimitMap = Record<string, LimitDefinition>;
export type PlanFeatureMap = Record<string, boolean>;

export type OrgUsageMap = Partial<Record<BillingLimitKey, number>> &
  Record<string, number>;

export type ResolvedBillingContext = {
  subscription: BillingSubscriptionRow | null;
  plan: BillingPlanRow | null;
  limits: PlanLimitMap;
  features: PlanFeatureMap;
  usage: OrgUsageMap;
  seatsPurchased: number;
  seatsUsed: number;
  trialDaysRemaining: number | null;
  customer: BillingCustomerRow | null;
};

export type FinancialMetrics = {
  mrrCents: number;
  arrCents: number;
  activeSubscriptions: number;
  trialing: number;
  churnedThisMonth: number;
  trialConversionReady: boolean;
};

export const DEFAULT_USAGE: OrgUsageMap = {
  max_users: 0,
  max_companies: 0,
  max_contacts: 0,
  max_campaigns: 0,
  max_ai_requests: 0,
  max_api_calls: 0,
  max_automations: 0,
  max_storage_mb: 0,
};

export type BillingFeatureAvailability = {
  features: Partial<Record<BillingFeatureKey, boolean>>;
  limits: PlanLimitMap;
  status: string | null;
  planCode: string | null;
};
