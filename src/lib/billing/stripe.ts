/**
 * Stripe integration scaffolding — never stores raw payment data.
 */

export type StripeCheckoutSessionInput = {
  organizationId: string;
  planCode: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string | null;
  seats?: number;
  couponCode?: string | null;
};

export type StripePortalSessionInput = {
  organizationId: string;
  stripeCustomerId: string;
  returnUrl: string;
};

export type StripeScaffoldResult = {
  ok: boolean;
  mode: "scaffold";
  message: string;
  url: string | null;
  payload: Record<string, unknown>;
};

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() &&
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim(),
  );
}

/** Creates a checkout URL placeholder until Stripe SDK is wired. */
export function createCheckoutSessionScaffold(
  input: StripeCheckoutSessionInput,
): StripeScaffoldResult {
  if (!isStripeConfigured()) {
    return {
      ok: true,
      mode: "scaffold",
      message:
        "Stripe keys not configured. Checkout scaffold ready for provider-hosted flow.",
      url: null,
      payload: { ...input, provider: "stripe" },
    };
  }
  return {
    ok: true,
    mode: "scaffold",
    message:
      "Stripe configured. Replace scaffold with stripe.checkout.sessions.create.",
    url: `/billing?checkout=pending&plan=${encodeURIComponent(input.planCode)}`,
    payload: { ...input, provider: "stripe" },
  };
}

export function createCustomerPortalScaffold(
  input: StripePortalSessionInput,
): StripeScaffoldResult {
  return {
    ok: true,
    mode: "scaffold",
    message: "Customer portal ready — wire billingPortal.sessions.create.",
    url: isStripeConfigured()
      ? `/billing/portal?customer=${encodeURIComponent(input.stripeCustomerId)}`
      : null,
    payload: { ...input, provider: "stripe" },
  };
}

export function verifyStripeWebhookSignatureScaffold(
  payload: string,
  signature: string | null,
): { ok: boolean; message: string } {
  void payload;
  void signature;
  if (!process.env.STRIPE_WEBHOOK_SECRET?.trim()) {
    return {
      ok: false,
      message: "STRIPE_WEBHOOK_SECRET not set — webhook verification ready.",
    };
  }
  return {
    ok: true,
    message: "Webhook secret present — verify with stripe.webhooks.constructEvent.",
  };
}
