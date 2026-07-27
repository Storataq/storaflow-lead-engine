"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  createCheckoutSessionScaffold,
  createCustomerPortalScaffold,
} from "@/lib/billing/stripe";
import { trialRemainingDays } from "@/lib/billing/limit-engine";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { hasSecurityPermission } from "@/lib/security/permissions";
import { createClient } from "@/lib/supabase/server";
import { toUserFacingError } from "@/lib/ui/user-facing-error";
import type { Json } from "@/types/supabase";

export type BillingActionResult = {
  success: boolean;
  message: string;
  id?: string;
  url?: string | null;
};

function canManageBilling(role: string) {
  return hasSecurityPermission(role, "billing", "manage");
}

function revalidateBilling() {
  revalidatePath("/billing");
  revalidatePath("/billing/plans");
  revalidatePath("/billing/usage");
  revalidatePath("/billing/invoices");
  revalidatePath("/billing/seats");
  revalidatePath("/billing/addons");
  revalidatePath("/billing/portal");
  revalidatePath("/settings");
}

async function audit(
  organizationId: string,
  actorUserId: string,
  action: string,
  description: string,
  metadata?: Record<string, unknown>,
) {
  const supabase = await createClient();
  await supabase.from("billing_audit_events").insert({
    organization_id: organizationId,
    actor_user_id: actorUserId,
    action,
    description,
    metadata_json: (metadata ?? {}) as Json,
  });
}

async function notify(
  organizationId: string,
  type: string,
  title: string,
  body: string,
) {
  const supabase = await createClient();
  await supabase.from("billing_notifications").insert({
    organization_id: organizationId,
    notification_type: type,
    title,
    body,
  });
}

export async function startTrialAction(
  planCode = "free_trial",
): Promise<BillingActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManageBilling(context.membership.role)) {
      return { success: false, message: "Only billing admins can start a trial." };
    }

    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("billing_subscriptions")
      .select("id, status")
      .eq("organization_id", context.organization.id)
      .maybeSingle();
    if (existing && existing.status !== "canceled") {
      return { success: false, message: "Subscription already exists." };
    }

    const { data: plan } = await supabase
      .from("billing_plans")
      .select("*")
      .eq("code", planCode)
      .eq("status", "active")
      .maybeSingle();
    if (!plan) return { success: false, message: "Trial plan not found." };

    const trialDays = plan.trial_days || 14;
    const starts = new Date();
    const ends = new Date(starts.getTime() + trialDays * 86400000);

    await supabase.from("billing_customers").upsert(
      {
        organization_id: context.organization.id,
        billing_email: context.organization.support_email,
        billing_name: context.organization.name,
      },
      { onConflict: "organization_id" },
    );

    const { data, error } = await supabase
      .from("billing_subscriptions")
      .upsert(
        {
          organization_id: context.organization.id,
          plan_id: plan.id,
          status: "trialing",
          billing_interval: plan.billing_interval,
          seats_purchased: plan.included_seats,
          trial_starts_at: starts.toISOString(),
          trial_ends_at: ends.toISOString(),
          current_period_start: starts.toISOString(),
          current_period_end: ends.toISOString(),
        },
        { onConflict: "organization_id" },
      )
      .select("id")
      .single();
    if (error) throw error;

    await supabase.from("billing_seat_ledger").insert({
      organization_id: context.organization.id,
      change_type: "purchase",
      seats_delta: plan.included_seats,
      seats_after: plan.included_seats,
      actor_user_id: context.membership.user_id,
      note: "Trial seats",
    });

    await audit(
      context.organization.id,
      context.membership.user_id,
      "trial_started",
      `Started ${plan.name} trial`,
      { planCode },
    );
    await notify(
      context.organization.id,
      "trial_ending",
      "Trial started",
      `${trialDays} days remaining on ${plan.name}.`,
    );

    revalidateBilling();
    return { success: true, message: "Trial started.", id: data.id };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not start trial."),
    };
  }
}

export async function changePlanAction(input: {
  planCode: string;
  mode: "upgrade" | "downgrade";
}): Promise<BillingActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManageBilling(context.membership.role)) {
      return { success: false, message: "Only billing admins can change plans." };
    }

    const parsed = z
      .object({
        planCode: z.string().min(2),
        mode: z.enum(["upgrade", "downgrade"]),
      })
      .parse(input);

    const supabase = await createClient();
    const { data: plan } = await supabase
      .from("billing_plans")
      .select("*")
      .eq("code", parsed.planCode)
      .eq("status", "active")
      .maybeSingle();
    if (!plan) return { success: false, message: "Plan not found." };

    const { data: sub } = await supabase
      .from("billing_subscriptions")
      .select("*")
      .eq("organization_id", context.organization.id)
      .maybeSingle();
    if (!sub) return { success: false, message: "Start a trial or subscribe first." };

    if (parsed.mode === "downgrade") {
      const { error } = await supabase
        .from("billing_subscriptions")
        .update({
          scheduled_plan_id: plan.id,
          cancel_at_period_end: false,
        })
        .eq("id", sub.id);
      if (error) throw error;
      await audit(
        context.organization.id,
        context.membership.user_id,
        "plan_downgrade_scheduled",
        `Scheduled downgrade to ${plan.name}`,
      );
      revalidateBilling();
      return { success: true, message: "Downgrade scheduled for period end." };
    }

    const now = new Date();
    const periodEnd = new Date(now);
    if (plan.billing_interval === "year") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const { error } = await supabase
      .from("billing_subscriptions")
      .update({
        plan_id: plan.id,
        status: "active",
        billing_interval: plan.billing_interval,
        seats_purchased: Math.max(sub.seats_purchased, plan.included_seats),
        trial_ends_at: null,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        scheduled_plan_id: null,
      })
      .eq("id", sub.id);
    if (error) throw error;

    await audit(
      context.organization.id,
      context.membership.user_id,
      "plan_upgraded",
      `Upgraded to ${plan.name}`,
    );
    await notify(
      context.organization.id,
      "plan_upgraded",
      "Plan upgraded",
      `Your organization is now on ${plan.name}.`,
    );

    revalidateBilling();
    return { success: true, message: `Upgraded to ${plan.name}.` };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not change plan."),
    };
  }
}

export async function convertTrialAction(
  planCode: string,
): Promise<BillingActionResult> {
  return changePlanAction({ planCode, mode: "upgrade" });
}

export async function extendTrialAction(
  extraDays: number,
): Promise<BillingActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManageBilling(context.membership.role)) {
      return { success: false, message: "Only admins can extend trials." };
    }
    const days = z.number().int().min(1).max(90).parse(extraDays);
    const supabase = await createClient();
    const { data: sub } = await supabase
      .from("billing_subscriptions")
      .select("*")
      .eq("organization_id", context.organization.id)
      .maybeSingle();
    if (!sub || sub.status !== "trialing") {
      return { success: false, message: "No active trial to extend." };
    }
    const base = sub.trial_ends_at
      ? new Date(sub.trial_ends_at)
      : new Date();
    base.setDate(base.getDate() + days);
    const { error } = await supabase
      .from("billing_subscriptions")
      .update({
        trial_ends_at: base.toISOString(),
        current_period_end: base.toISOString(),
      })
      .eq("id", sub.id);
    if (error) throw error;
    await audit(
      context.organization.id,
      context.membership.user_id,
      "trial_extended",
      `Trial extended by ${days} days`,
    );
    revalidateBilling();
    return {
      success: true,
      message: `Trial extended. ${trialRemainingDays(base.toISOString())} days remaining.`,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not extend trial."),
    };
  }
}

export async function adjustSeatsAction(input: {
  seats: number;
  note?: string;
}): Promise<BillingActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManageBilling(context.membership.role)) {
      return { success: false, message: "Only billing admins can manage seats." };
    }
    const seats = z.number().int().min(1).max(10000).parse(input.seats);
    const supabase = await createClient();
    const { data: sub } = await supabase
      .from("billing_subscriptions")
      .select("*")
      .eq("organization_id", context.organization.id)
      .maybeSingle();
    if (!sub) return { success: false, message: "No subscription." };

    const delta = seats - sub.seats_purchased;
    const { error } = await supabase
      .from("billing_subscriptions")
      .update({ seats_purchased: seats })
      .eq("id", sub.id);
    if (error) throw error;

    await supabase.from("billing_seat_ledger").insert({
      organization_id: context.organization.id,
      change_type: delta >= 0 ? "purchase" : "adjust",
      seats_delta: delta,
      seats_after: seats,
      actor_user_id: context.membership.user_id,
      note: input.note ?? "Seat adjustment",
    });

    await audit(
      context.organization.id,
      context.membership.user_id,
      "seats_adjusted",
      `Seats set to ${seats}`,
    );
    revalidateBilling();
    return { success: true, message: `Seats updated to ${seats}.` };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not update seats."),
    };
  }
}

export async function purchaseAddonAction(input: {
  addonCode: string;
  quantity?: number;
}): Promise<BillingActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManageBilling(context.membership.role)) {
      return { success: false, message: "Only billing admins can buy add-ons." };
    }
    const supabase = await createClient();
    const { data: addon } = await supabase
      .from("billing_addons")
      .select("*")
      .eq("code", input.addonCode)
      .eq("status", "active")
      .maybeSingle();
    if (!addon) return { success: false, message: "Add-on not found." };

    const qty = input.quantity ?? 1;
    const { error } = await supabase.from("billing_org_addons").upsert(
      {
        organization_id: context.organization.id,
        addon_id: addon.id,
        quantity: qty,
        status: "active",
      },
      { onConflict: "organization_id,addon_id" },
    );
    if (error) throw error;

    if (addon.addon_type === "extra_users") {
      const { data: sub } = await supabase
        .from("billing_subscriptions")
        .select("*")
        .eq("organization_id", context.organization.id)
        .maybeSingle();
      if (sub) {
        const seats = sub.seats_purchased + qty;
        await supabase
          .from("billing_subscriptions")
          .update({ seats_purchased: seats })
          .eq("id", sub.id);
        await supabase.from("billing_seat_ledger").insert({
          organization_id: context.organization.id,
          change_type: "addon",
          seats_delta: qty,
          seats_after: seats,
          actor_user_id: context.membership.user_id,
          note: `Addon ${addon.code}`,
        });
      }
    }

    await audit(
      context.organization.id,
      context.membership.user_id,
      "addon_purchased",
      `Purchased ${addon.name} x${qty}`,
    );
    revalidateBilling();
    return { success: true, message: `${addon.name} added.` };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not purchase add-on."),
    };
  }
}

export async function redeemCouponAction(
  code: string,
): Promise<BillingActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManageBilling(context.membership.role)) {
      return { success: false, message: "Not allowed." };
    }
    const supabase = await createClient();
    const { data: coupon } = await supabase
      .from("billing_coupons")
      .select("*")
      .eq("code", code.trim().toUpperCase())
      .eq("status", "active")
      .maybeSingle();
    if (!coupon) {
      // Allow creating scaffold redemption message for unknown — still fail
      return { success: false, message: "Coupon not found or inactive." };
    }
    await supabase.from("billing_coupon_redemptions").insert({
      organization_id: context.organization.id,
      coupon_id: coupon.id,
      redeemed_by: context.membership.user_id,
    });
    await supabase
      .from("billing_subscriptions")
      .update({ coupon_id: coupon.id })
      .eq("organization_id", context.organization.id);
    await audit(
      context.organization.id,
      context.membership.user_id,
      "coupon_redeemed",
      `Redeemed coupon ${coupon.code}`,
    );
    revalidateBilling();
    return { success: true, message: `Coupon ${coupon.code} applied.` };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not redeem coupon."),
    };
  }
}

export async function startCheckoutAction(input: {
  planCode: string;
  seats?: number;
  couponCode?: string;
}): Promise<BillingActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManageBilling(context.membership.role)) {
      return { success: false, message: "Not allowed." };
    }
    const result = createCheckoutSessionScaffold({
      organizationId: context.organization.id,
      planCode: input.planCode,
      seats: input.seats,
      couponCode: input.couponCode,
      customerEmail: context.organization.support_email,
      successUrl: "/billing?checkout=success",
      cancelUrl: "/billing?checkout=cancel",
    });
    await audit(
      context.organization.id,
      context.membership.user_id,
      "checkout_started",
      `Checkout scaffold for ${input.planCode}`,
      result.payload,
    );
    return {
      success: true,
      message: result.message,
      url: result.url,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not start checkout."),
    };
  }
}

export async function openCustomerPortalAction(): Promise<BillingActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManageBilling(context.membership.role)) {
      return { success: false, message: "Not allowed." };
    }
    const supabase = await createClient();
    const { data: customer } = await supabase
      .from("billing_customers")
      .select("*")
      .eq("organization_id", context.organization.id)
      .maybeSingle();
    const result = createCustomerPortalScaffold({
      organizationId: context.organization.id,
      stripeCustomerId: customer?.stripe_customer_id ?? "cus_pending",
      returnUrl: "/billing",
    });
    return {
      success: true,
      message: result.message,
      url: result.url,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not open portal."),
    };
  }
}

export async function markBillingNotificationReadAction(
  id: string,
): Promise<BillingActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const supabase = await createClient();
    await supabase
      .from("billing_notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("organization_id", context.organization.id);
    revalidateBilling();
    return { success: true, message: "Marked read." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not update notification."),
    };
  }
}

export async function createDemoInvoiceAction(): Promise<BillingActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManageBilling(context.membership.role)) {
      return { success: false, message: "Not allowed." };
    }
    const supabase = await createClient();
    const number = `INV-${Date.now().toString().slice(-8)}`;
    const { data, error } = await supabase
      .from("billing_invoices")
      .insert({
        organization_id: context.organization.id,
        number,
        status: "open",
        amount_due_cents: 7900,
        currency: "eur",
        hosted_invoice_url: null,
        invoice_pdf_url: null,
      })
      .select("id")
      .single();
    if (error) throw error;
    await notify(
      context.organization.id,
      "invoice_available",
      "Invoice available",
      `Invoice ${number} is ready.`,
    );
    revalidateBilling();
    return { success: true, message: "Demo invoice created.", id: data.id };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not create invoice."),
    };
  }
}

export async function updateBillingDetailsAction(input: {
  billingEmail?: string;
  billingName?: string;
  vatNumber?: string;
  taxId?: string;
}): Promise<BillingActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManageBilling(context.membership.role)) {
      return { success: false, message: "Not allowed." };
    }
    const supabase = await createClient();
    await supabase.from("billing_customers").upsert(
      {
        organization_id: context.organization.id,
        billing_email: input.billingEmail ?? null,
        billing_name: input.billingName ?? null,
        vat_number: input.vatNumber ?? null,
        tax_id: input.taxId ?? null,
      },
      { onConflict: "organization_id" },
    );
    await audit(
      context.organization.id,
      context.membership.user_id,
      "billing_details_updated",
      "Billing details updated",
    );
    revalidateBilling();
    return { success: true, message: "Billing details saved." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not save billing details."),
    };
  }
}
