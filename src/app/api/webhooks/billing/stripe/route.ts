import { NextResponse } from "next/server";

import { verifyStripeWebhookSignatureScaffold } from "@/lib/billing/stripe";
import { createServiceClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/supabase";

/**
 * POST /api/webhooks/billing/stripe — Stripe webhook receiver (scaffold).
 * Stores events in billing_stripe_events. Never logs raw PAN.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("stripe-signature");
  const verify = verifyStripeWebhookSignatureScaffold(raw, signature);

  if (!verify.ok) {
    return NextResponse.json(
      { ok: false, error: verify.message },
      { status: 400 },
    );
  }

  let eventType = "unknown";
  let eventId = `evt_scaffold_${Date.now()}`;
  let organizationId: string | null = null;
  let payload: Json = {};

  try {
    const parsed = JSON.parse(raw) as {
      id?: string;
      type?: string;
      data?: { object?: { metadata?: { organization_id?: string } } };
    };
    eventId = parsed.id ?? eventId;
    eventType = parsed.type ?? eventType;
    organizationId =
      parsed.data?.object?.metadata?.organization_id ?? null;
    payload = parsed as Json;
  } catch {
    payload = { rawLength: raw.length };
  }

  try {
    const supabase = createServiceClient();
    await supabase.from("billing_stripe_events").upsert(
      {
        stripe_event_id: eventId,
        event_type: eventType,
        organization_id: organizationId,
        payload_json: payload,
        processed_at: new Date().toISOString(),
      },
      { onConflict: "stripe_event_id" },
    );
  } catch {
    // Tables may not be migrated yet — still acknowledge scaffold receipt
  }

  return NextResponse.json({
    ok: true,
    mode: "scaffold",
    message: verify.message,
    eventId,
    eventType,
  });
}
