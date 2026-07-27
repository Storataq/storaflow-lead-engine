/**
 * Billing queries + usage aggregation + limit context.
 */

import { createClient } from "@/lib/supabase/server";
import {
  checkFeature,
  checkLimit,
  trialRemainingDays,
  type LimitDefinition,
} from "@/lib/billing/limit-engine";
import type { BillingFeatureKey, BillingLimitKey } from "@/lib/billing/constants";
import {
  DEFAULT_USAGE,
  type BillingAddonRow,
  type BillingInvoiceRow,
  type BillingNotificationRow,
  type BillingPaymentMethodRow,
  type BillingPlanRow,
  type BillingSeatLedgerRow,
  type BillingSubscriptionRow,
  type FinancialMetrics,
  type OrgUsageMap,
  type PlanFeatureMap,
  type PlanLimitMap,
  type ResolvedBillingContext,
} from "@/lib/billing/types";

async function loadPlanLimits(planId: string): Promise<PlanLimitMap> {
  const supabase = await createClient();
  try {
    const { data } = await supabase
      .from("billing_plan_limits")
      .select("*")
      .eq("plan_id", planId);
    const map: PlanLimitMap = {};
    for (const row of data ?? []) {
      map[row.limit_key] = {
        limitKey: row.limit_key,
        limitValue: Number(row.limit_value),
        softLimit: row.soft_limit != null ? Number(row.soft_limit) : null,
        warningThresholdPct: row.warning_threshold_pct,
        enforcement: row.enforcement === "soft" ? "soft" : "hard",
      };
    }
    return map;
  } catch {
    return {};
  }
}

async function loadPlanFeatures(planId: string): Promise<PlanFeatureMap> {
  const supabase = await createClient();
  try {
    const { data } = await supabase
      .from("billing_plan_features")
      .select("*")
      .eq("plan_id", planId);
    const map: PlanFeatureMap = {};
    for (const row of data ?? []) {
      map[row.feature_key] = row.enabled;
    }
    return map;
  } catch {
    return {};
  }
}

export async function computeOrgUsage(
  organizationId: string,
): Promise<OrgUsageMap> {
  const supabase = await createClient();
  const usage: OrgUsageMap = { ...DEFAULT_USAGE };

  const safeCount = async (table: string) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count } = await (supabase.from as any)(table).select("*", {
        count: "exact",
        head: true,
      }).eq("organization_id", organizationId);
      return count ?? 0;
    } catch {
      return 0;
    }
  };

  const [users, companies, contacts, campaigns, automations] =
    await Promise.all([
      safeCount("organization_members"),
      safeCount("companies"),
      safeCount("crm_lead_contacts").catch(() => safeCount("contacts")),
      safeCount("email_campaigns"),
      safeCount("crm_automations"),
    ]);

  usage.max_users = users;
  usage.max_companies = companies;
  usage.max_contacts = contacts;
  usage.max_campaigns = campaigns;
  usage.max_automations = automations;

  try {
    const { data } = await supabase
      .from("platform_api_usage_daily")
      .select("request_count")
      .eq("organization_id", organizationId);
    usage.max_api_calls = (data ?? []).reduce(
      (sum, row) => sum + Number(row.request_count ?? 0),
      0,
    );
  } catch {
    usage.max_api_calls = 0;
  }

  return usage;
}

export async function listBillingPlans(): Promise<BillingPlanRow[]> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("billing_plans")
      .select("*")
      .eq("status", "active")
      .eq("is_public", true)
      .order("sort_order");
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getOrgSubscription(
  organizationId: string,
): Promise<BillingSubscriptionRow | null> {
  const supabase = await createClient();
  try {
    const { data } = await supabase
      .from("billing_subscriptions")
      .select("*")
      .eq("organization_id", organizationId)
      .maybeSingle();
    return data;
  } catch {
    return null;
  }
}

export async function resolveBillingContext(
  organizationId: string,
): Promise<ResolvedBillingContext> {
  const supabase = await createClient();
  const subscription = await getOrgSubscription(organizationId);
  let plan: BillingPlanRow | null = null;
  let limits: PlanLimitMap = {};
  let features: PlanFeatureMap = {};

  if (subscription) {
    const { data } = await supabase
      .from("billing_plans")
      .select("*")
      .eq("id", subscription.plan_id)
      .maybeSingle();
    plan = data;
    if (plan) {
      limits = await loadPlanLimits(plan.id);
      features = await loadPlanFeatures(plan.id);
    }
  }

  const usage = await computeOrgUsage(organizationId);
  let customer = null;
  try {
    const { data } = await supabase
      .from("billing_customers")
      .select("*")
      .eq("organization_id", organizationId)
      .maybeSingle();
    customer = data;
  } catch {
    customer = null;
  }

  return {
    subscription,
    plan,
    limits,
    features,
    usage,
    seatsPurchased: subscription?.seats_purchased ?? 0,
    seatsUsed: usage.max_users ?? 0,
    trialDaysRemaining: trialRemainingDays(subscription?.trial_ends_at),
    customer,
  };
}

/** Central entry — check a limit for the org. */
export async function evaluateOrgLimit(
  organizationId: string,
  limitKey: BillingLimitKey | string,
  delta = 1,
) {
  const ctx = await resolveBillingContext(organizationId);
  const def: LimitDefinition = ctx.limits[limitKey] ?? {
    limitKey,
    limitValue: 0,
    warningThresholdPct: 80,
    enforcement: "hard",
  };
  const current = Number(ctx.usage[limitKey] ?? 0);
  return checkLimit(def, current, delta);
}

export async function evaluateOrgFeature(
  organizationId: string,
  featureKey: BillingFeatureKey | string,
) {
  const ctx = await resolveBillingContext(organizationId);
  const enabled = Boolean(ctx.features[featureKey]);
  return checkFeature(featureKey, enabled);
}

export async function listInvoices(
  organizationId: string,
): Promise<BillingInvoiceRow[]> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("billing_invoices")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

export async function listPaymentMethods(
  organizationId: string,
): Promise<BillingPaymentMethodRow[]> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("billing_payment_methods")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("status", "active");
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

export async function listAddons(): Promise<BillingAddonRow[]> {
  const supabase = await createClient();
  try {
    const { data } = await supabase
      .from("billing_addons")
      .select("*")
      .eq("status", "active")
      .order("name");
    return data ?? [];
  } catch {
    return [];
  }
}

export async function listSeatLedger(
  organizationId: string,
): Promise<BillingSeatLedgerRow[]> {
  const supabase = await createClient();
  try {
    const { data } = await supabase
      .from("billing_seat_ledger")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(50);
    return data ?? [];
  } catch {
    return [];
  }
}

export async function listBillingNotifications(
  organizationId: string,
): Promise<BillingNotificationRow[]> {
  const supabase = await createClient();
  try {
    const { data } = await supabase
      .from("billing_notifications")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(40);
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getFinancialMetricsScaffold(): Promise<FinancialMetrics> {
  const supabase = await createClient();
  try {
    const { data: subs } = await supabase
      .from("billing_subscriptions")
      .select("status, billing_interval, plan_id, seats_purchased");
    const { data: plans } = await supabase.from("billing_plans").select("*");
    const planMap = new Map((plans ?? []).map((p) => [p.id, p]));
    let mrr = 0;
    let active = 0;
    let trialing = 0;
    let churned = 0;
    for (const sub of subs ?? []) {
      if (sub.status === "trialing") trialing += 1;
      if (sub.status === "canceled") churned += 1;
      if (sub.status !== "active" && sub.status !== "trialing") continue;
      active += sub.status === "active" ? 1 : 0;
      const plan = planMap.get(sub.plan_id);
      if (!plan) continue;
      const price = Number(plan.price_cents);
      const monthly =
        plan.billing_interval === "year" ? Math.round(price / 12) : price;
      mrr += monthly;
    }
    return {
      mrrCents: mrr,
      arrCents: mrr * 12,
      activeSubscriptions: active,
      trialing,
      churnedThisMonth: churned,
      trialConversionReady: true,
    };
  } catch {
    return {
      mrrCents: 0,
      arrCents: 0,
      activeSubscriptions: 0,
      trialing: 0,
      churnedThisMonth: 0,
      trialConversionReady: true,
    };
  }
}
