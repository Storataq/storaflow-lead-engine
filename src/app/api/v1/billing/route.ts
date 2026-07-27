import { withApiHandler } from "@/lib/platform-api/handler";
import { apiSuccess } from "@/lib/platform-api/responses";
import {
  BILLING_FEATURE_KEYS,
  BILLING_LIMIT_KEYS,
} from "@/lib/billing/constants";
import { checkFeature, checkLimit } from "@/lib/billing/limit-engine";
import { resolveBillingContext } from "@/lib/billing/queries";

/**
 * GET /api/v1/billing — subscription status, features, usage.
 * Requires billing:read. Org-scoped via API key.
 */
export async function GET(request: Request) {
  return withApiHandler(request, "billing:read", async (ctx) => {
    const billing = await resolveBillingContext(ctx.organizationId);

    const limits = BILLING_LIMIT_KEYS.map((key) => {
      const def = billing.limits[key] ?? {
        limitKey: key,
        limitValue: 0,
        warningThresholdPct: 80,
        enforcement: "hard" as const,
      };
      const current = Number(billing.usage[key] ?? 0);
      return {
        key,
        ...checkLimit(def, current, 0),
      };
    });

    const features = Object.fromEntries(
      BILLING_FEATURE_KEYS.map((key) => [
        key,
        checkFeature(key, Boolean(billing.features[key])),
      ]),
    );

    return apiSuccess(
      {
        subscription: billing.subscription
          ? {
              status: billing.subscription.status,
              billingInterval: billing.subscription.billing_interval,
              seatsPurchased: billing.subscription.seats_purchased,
              seatsUsed: billing.seatsUsed,
              trialEndsAt: billing.subscription.trial_ends_at,
              trialDaysRemaining: billing.trialDaysRemaining,
              currentPeriodEnd: billing.subscription.current_period_end,
              cancelAtPeriodEnd: billing.subscription.cancel_at_period_end,
            }
          : null,
        plan: billing.plan
          ? {
              code: billing.plan.code,
              name: billing.plan.name,
              tier: billing.plan.plan_tier,
            }
          : null,
        features,
        limits,
        usage: billing.usage,
      },
      { requestId: ctx.requestId },
    );
  });
}
