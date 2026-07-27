import { NextResponse } from "next/server";

import { Resend } from "resend";

import {
  normalizeResendProviderEvent,
  persistAndProcessProviderEvent,
} from "@/lib/email/provider/events";
import { recordReplyFromReceivedWebhook } from "@/lib/email/tracking";
import { envFlag } from "@/lib/email/ops/security";

export async function POST(request: Request) {
  if (!envFlag("EMAIL_WEBHOOK_PROCESSING_ENABLED", true)) {
    return NextResponse.json(
      { ok: false, error: "Webhook processing disabled" },
      { status: 503 },
    );
  }

  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return NextResponse.json(
      { ok: false, error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { ok: false, error: "Missing webhook signature headers" },
      { status: 400 },
    );
  }

  const rawPayload = await request.text();
  const resend = new Resend(process.env.RESEND_API_KEY ?? "missing");

  let verifiedPayload: unknown;
  try {
    verifiedPayload = resend.webhooks.verify({
      payload: rawPayload,
      headers: {
        id: svixId,
        timestamp: svixTimestamp,
        signature: svixSignature,
      },
      webhookSecret,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid webhook signature" },
      { status: 400 },
    );
  }

  const receivedPayload = verifiedPayload as {
    type?: string;
    created_at?: string | null;
    data?: {
      from?: string | null;
      to?: string[] | null;
      subject?: string | null;
    } | null;
  };

  if (receivedPayload.type === "email.received") {
    await recordReplyFromReceivedWebhook({
      providerEventId: svixId,
      fromEmail: receivedPayload.data?.from ?? null,
      toEmail: receivedPayload.data?.to?.[0] ?? null,
      occurredAtIso: receivedPayload.created_at ?? null,
      subject: receivedPayload.data?.subject ?? null,
    });

    return NextResponse.json({
      ok: true,
      duplicate: false,
      providerEventId: svixId,
      replyTracked: true,
    });
  }

  const normalized = normalizeResendProviderEvent({
    payload: verifiedPayload as {
      type: string;
      created_at?: string | null;
      data?: Record<string, unknown> | null;
    },
    rawPayload,
    providerEventId: svixId,
  });

  const result = await persistAndProcessProviderEvent({ normalized });
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error ?? "Failed to persist provider event" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    duplicate: result.duplicate,
    providerEventId: result.providerEventId,
  });
}

