/**
 * Outbound webhook delivery + retry.
 */

import { randomUUID } from "crypto";

import { createServiceClient } from "@/lib/supabase/admin";
import type { PlatformEvent } from "@/lib/platform-api/event-bus";
import {
  decryptWebhookSecret,
  nextWebhookRetryAt,
  signPlatformWebhook,
} from "@/lib/platform-api/webhook-security";
import type { Json } from "@/types/supabase";

export async function enqueueWebhookDeliveriesForEvent(
  event: PlatformEvent & { eventId?: string },
): Promise<number> {
  const eventId = event.eventId ?? randomUUID();
  const supabase = createServiceClient();
  const { data: hooks } = await supabase
    .from("platform_webhooks")
    .select(
      "id, event_types_json, status, target_url, https_only, secret_ciphertext_base64, secret_iv_base64, secret_auth_tag_base64, secret_key_version",
    )
    .eq("organization_id", event.organizationId)
    .eq("status", "active");

  let queued = 0;
  for (const hook of hooks ?? []) {
    const types = Array.isArray(hook.event_types_json)
      ? hook.event_types_json.map(String)
      : [];
    if (types.length && !types.includes(event.eventType)) continue;

    await supabase.from("platform_webhook_deliveries").insert({
      organization_id: event.organizationId,
      webhook_id: hook.id,
      event_type: event.eventType,
      event_id: eventId,
      status: "queued",
      payload_json: {
        id: eventId,
        type: event.eventType,
        created_at: new Date().toISOString(),
        data: event.payload,
      } as Json,
      payload_size_bytes: JSON.stringify(event.payload).length,
    });
    queued += 1;
  }
  return queued;
}

export async function deliverWebhookAttempt(input: {
  organizationId: string;
  deliveryId: string;
}): Promise<{ ok: boolean; statusCode?: number; error?: string }> {
  const supabase = createServiceClient();
  const { data: delivery } = await supabase
    .from("platform_webhook_deliveries")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("id", input.deliveryId)
    .maybeSingle();
  if (!delivery) return { ok: false, error: "Delivery not found" };

  const { data: webhook } = await supabase
    .from("platform_webhooks")
    .select("*")
    .eq("id", delivery.webhook_id)
    .maybeSingle();
  if (!webhook || webhook.status !== "active") {
    return { ok: false, error: "Webhook inactive" };
  }

  const body = JSON.stringify(delivery.payload_json ?? {});
  const timestamp = String(Math.floor(Date.now() / 1000));
  let signature = "";
  if (
    webhook.secret_ciphertext_base64 &&
    webhook.secret_iv_base64 &&
    webhook.secret_auth_tag_base64
  ) {
    const secret = decryptWebhookSecret({
      ciphertextBase64: webhook.secret_ciphertext_base64,
      ivBase64: webhook.secret_iv_base64,
      authTagBase64: webhook.secret_auth_tag_base64,
      keyVersion: webhook.secret_key_version,
    });
    signature = signPlatformWebhook({ secret, timestamp, body });
  }

  const started = Date.now();
  let httpStatus = 0;
  let responsePreview = "";
  let errorMessage: string | null = null;
  let ok = false;

  try {
    const res = await fetch(webhook.target_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Storaflow-Webhooks/1.0",
        "X-Storaflow-Event": delivery.event_type,
        "X-Storaflow-Delivery": delivery.id,
        "X-Storaflow-Timestamp": timestamp,
        ...(signature
          ? { "X-Storaflow-Signature": `sha256=${signature}` }
          : {}),
      },
      body,
      signal: AbortSignal.timeout(15_000),
    });
    httpStatus = res.status;
    responsePreview = (await res.text()).slice(0, 500);
    ok = res.ok;
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Delivery failed";
  }

  const durationMs = Date.now() - started;
  const attempt = delivery.attempt_count + 1;

  if (ok) {
    await supabase
      .from("platform_webhook_deliveries")
      .update({
        status: "delivered",
        attempt_count: attempt,
        http_status: httpStatus,
        duration_ms: durationMs,
        response_body_preview: responsePreview,
        delivered_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", delivery.id);
    await supabase
      .from("platform_webhooks")
      .update({
        last_delivery_at: new Date().toISOString(),
        last_success_at: new Date().toISOString(),
      })
      .eq("id", webhook.id);
    return { ok: true, statusCode: httpStatus };
  }

  const retryAt = nextWebhookRetryAt(attempt);
  const status = attempt >= 5 ? "failed" : "retrying";
  await supabase
    .from("platform_webhook_deliveries")
    .update({
      status,
      attempt_count: attempt,
      http_status: httpStatus || null,
      duration_ms: durationMs,
      response_body_preview: responsePreview || null,
      error_message: errorMessage ?? `HTTP ${httpStatus}`,
      next_retry_at: status === "retrying" ? retryAt.toISOString() : null,
    })
    .eq("id", delivery.id);
  await supabase
    .from("platform_webhooks")
    .update({
      last_delivery_at: new Date().toISOString(),
      last_failure_at: new Date().toISOString(),
    })
    .eq("id", webhook.id);

  return {
    ok: false,
    statusCode: httpStatus || undefined,
    error: errorMessage ?? `HTTP ${httpStatus}`,
  };
}

/** Wire event bus → delivery queue (call once from route module side-effect). */
export function registerWebhookEventListener() {
  // Lazy import to avoid cycles
  void import("@/lib/platform-api/event-bus").then(({ subscribePlatformEvents }) => {
    subscribePlatformEvents(async (event) => {
      try {
        await enqueueWebhookDeliveriesForEvent(event);
      } catch {
        /* best effort */
      }
    });
  });
}
