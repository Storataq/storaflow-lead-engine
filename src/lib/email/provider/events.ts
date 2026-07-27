/* eslint-disable @typescript-eslint/no-explicit-any */

import { createHash } from "crypto";

import type { Json } from "@/types/supabase";
import { createServiceClient } from "@/lib/supabase/admin";
import { normalizeSuppressionEmail } from "@/lib/email/suppression";

type ResendBounce = {
  type?: string | null;
  subType?: string | null;
  message?: string | null;
  diagnosticCode?: string[] | null;
};

type ResendWebhookPayload = {
  type: string;
  created_at?: string | null;
  data?: {
    email_id?: string | null;
    message_id?: string | null;
    created_at?: string | null;
    to?: string[] | null;
    from?: string | null;
    subject?: string | null;
    tags?: Record<string, string> | null;
    bounce?: ResendBounce | null;
    last_event?: string | null;
  } | null;
};

export type NormalizedProviderEventType =
  | "accepted"
  | "sent"
  | "delivered"
  | "delayed"
  | "soft_bounced"
  | "hard_bounced"
  | "complained"
  | "rejected"
  | "failed"
  | "unknown";

type NormalizedProviderEvent = {
  provider: "resend";
  providerEventId: string;
  providerMessageId: string | null;
  eventType: string;
  normalizedEventType: NormalizedProviderEventType;
  providerEventTimestamp: string | null;
  payloadFingerprint: string;
  recipientEmail: string | null;
  bounceType: "hard" | "soft" | "unknown" | null;
  providerStatus: string;
  rawPayload: ResendWebhookPayload;
};

type QueueDispatchRow = {
  id: string;
  organization_id: string;
  campaign_id: string | null;
  campaign_execution_id: string | null;
  enrollment_id: string | null;
  step_execution_id: string | null;
  recipient_id: string;
  provider_code: string;
  provider_message_id: string | null;
  status: string;
};

type SupabaseLike = any;

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function mapResendEventType(
  payload: ResendWebhookPayload,
): Pick<NormalizedProviderEvent, "normalizedEventType" | "bounceType" | "providerStatus"> {
  const bounceType = payload.data?.bounce?.type?.toLowerCase() ?? null;
  switch (payload.type) {
    case "email.sent":
      return { normalizedEventType: "sent", bounceType: null, providerStatus: "sent" };
    case "email.delivered":
      return {
        normalizedEventType: "delivered",
        bounceType: null,
        providerStatus: "delivered",
      };
    case "email.delivery_delayed":
      return {
        normalizedEventType: "delayed",
        bounceType: null,
        providerStatus: "delivery_delayed",
      };
    case "email.bounced":
      if (bounceType === "permanent") {
        return {
          normalizedEventType: "hard_bounced",
          bounceType: "hard",
          providerStatus: "bounced",
        };
      }
      if (bounceType === "transient") {
        return {
          normalizedEventType: "soft_bounced",
          bounceType: "soft",
          providerStatus: "bounced",
        };
      }
      return {
        normalizedEventType: "soft_bounced",
        bounceType: "unknown",
        providerStatus: "bounced",
      };
    case "email.complained":
      return {
        normalizedEventType: "complained",
        bounceType: null,
        providerStatus: "complained",
      };
    case "email.failed":
      return {
        normalizedEventType: "failed",
        bounceType: null,
        providerStatus: "failed",
      };
    case "email.suppressed":
      return {
        normalizedEventType: "rejected",
        bounceType: null,
        providerStatus: "suppressed",
      };
    default:
      return {
        normalizedEventType: "unknown",
        bounceType: null,
        providerStatus: payload.type.replace("email.", ""),
      };
  }
}

export function normalizeResendProviderEvent(input: {
  payload: ResendWebhookPayload;
  rawPayload: string;
  providerEventId: string;
}): NormalizedProviderEvent {
  const mapped = mapResendEventType(input.payload);
  return {
    provider: "resend",
    providerEventId: input.providerEventId,
    providerMessageId: input.payload.data?.email_id ?? null,
    eventType: input.payload.type,
    normalizedEventType: mapped.normalizedEventType,
    providerEventTimestamp:
      input.payload.created_at ?? input.payload.data?.created_at ?? null,
    payloadFingerprint: sha256(`${input.providerEventId}:${input.rawPayload}`),
    recipientEmail: input.payload.data?.to?.[0]?.trim().toLowerCase() ?? null,
    bounceType: mapped.bounceType,
    providerStatus: mapped.providerStatus,
    rawPayload: input.payload,
  };
}

async function upsertDeliveryStatus(input: {
  queueRow: QueueDispatchRow;
  providerEventRowId: string;
  normalized: NormalizedProviderEvent;
}) {
  const supabase = createServiceClient() as SupabaseLike;
  const { data: existing } = await supabase
    .from("email_message_delivery_status")
    .select("*")
    .eq("queue_item_id", input.queueRow.id)
    .maybeSingle();
  const nextStatus = chooseNextDeliveryStatus(
    existing?.current_status ?? "prepared",
    input.normalized.normalizedEventType,
  );

  const eventAt =
    input.normalized.providerEventTimestamp ?? new Date().toISOString();

  const payload = {
    organization_id: input.queueRow.organization_id,
    queue_item_id: input.queueRow.id,
    campaign_id: input.queueRow.campaign_id,
    campaign_execution_id: input.queueRow.campaign_execution_id,
    enrollment_id: input.queueRow.enrollment_id,
    step_execution_id: input.queueRow.step_execution_id,
    recipient_id: input.queueRow.recipient_id,
    provider: input.normalized.provider,
    provider_message_id: input.normalized.providerMessageId,
    current_status: nextStatus,
    latest_event_at: eventAt,
    provider_status: input.normalized.providerStatus,
    last_event_id: input.providerEventRowId,
    accepted_at:
      nextStatus === "accepted" || existing?.accepted_at ? existing?.accepted_at ?? eventAt : null,
    sent_at:
      nextStatus === "sent" || existing?.sent_at ? existing?.sent_at ?? eventAt : null,
    delivered_at:
      nextStatus === "delivered" || existing?.delivered_at
        ? existing?.delivered_at ?? eventAt
        : null,
    first_delayed_at:
      nextStatus === "delayed"
        ? existing?.first_delayed_at ?? eventAt
        : existing?.first_delayed_at ?? null,
    last_delayed_at:
      nextStatus === "delayed" ? eventAt : existing?.last_delayed_at ?? null,
    soft_bounced_at:
      nextStatus === "soft_bounced"
        ? existing?.soft_bounced_at ?? eventAt
        : existing?.soft_bounced_at ?? null,
    hard_bounced_at:
      nextStatus === "hard_bounced"
        ? existing?.hard_bounced_at ?? eventAt
        : existing?.hard_bounced_at ?? null,
    complained_at:
      nextStatus === "complained"
        ? existing?.complained_at ?? eventAt
        : existing?.complained_at ?? null,
    failed_at:
      nextStatus === "failed" || nextStatus === "rejected"
        ? existing?.failed_at ?? eventAt
        : existing?.failed_at ?? null,
  };

  if (existing) {
    await supabase
      .from("email_message_delivery_status")
      .update(payload)
      .eq("queue_item_id", input.queueRow.id);
  } else {
    await supabase.from("email_message_delivery_status").insert(payload);
  }
}

function chooseNextDeliveryStatus(
  current: string,
  incoming: NormalizedProviderEventType,
): string {
  if (current === incoming) return current;
  if (incoming === "unknown") return current;
  if (current === "complained") return current;
  if (current === "hard_bounced") return current;
  if (current === "rejected") return current;
  if (current === "failed") return current;
  if (current === "cancelled") return current;
  if (current === "delivered") {
    return incoming === "complained" ? "complained" : current;
  }
  if (current === "soft_bounced") {
    if (incoming === "delivered" || incoming === "hard_bounced" || incoming === "complained") {
      return incoming;
    }
    return current;
  }
  if (current === "delayed") {
    if (
      incoming === "delivered" ||
      incoming === "soft_bounced" ||
      incoming === "hard_bounced" ||
      incoming === "complained" ||
      incoming === "failed" ||
      incoming === "rejected"
    ) {
      return incoming;
    }
    return current;
  }
  if (incoming === "sent") return "sent";
  return incoming;
}

function mapQueueStatus(normalizedType: NormalizedProviderEventType): string | null {
  switch (normalizedType) {
    case "sent":
      return "sent";
    case "delivered":
      return "delivered";
    case "delayed":
      return "delayed";
    case "soft_bounced":
    case "hard_bounced":
      return "bounced";
    case "complained":
      return "complained";
    case "rejected":
      return "rejected";
    case "failed":
      return "failed";
    default:
      return null;
  }
}

async function insertFoundationEmailEvent(input: {
  queueRow: QueueDispatchRow;
  normalized: NormalizedProviderEvent;
}) {
  const supabase = createServiceClient() as SupabaseLike;

  const eventType =
    input.normalized.normalizedEventType === "delivered"
      ? "email_delivered"
      : input.normalized.normalizedEventType === "complained"
        ? "complaint_received"
        : input.normalized.normalizedEventType === "soft_bounced" ||
            input.normalized.normalizedEventType === "hard_bounced"
          ? "email_bounced"
          : null;

  if (!eventType) return;

  await supabase.from("email_events").insert({
    organization_id: input.queueRow.organization_id,
    queue_item_id: input.queueRow.id,
    recipient_id: input.queueRow.recipient_id,
    campaign_id: input.queueRow.campaign_id,
    event_type: eventType,
    bounce_type:
      input.normalized.normalizedEventType === "soft_bounced"
        ? "soft"
        : input.normalized.normalizedEventType === "hard_bounced"
          ? "hard"
          : null,
    payload_json: input.normalized.rawPayload as unknown as Json,
    occurred_at:
      input.normalized.providerEventTimestamp ?? new Date().toISOString(),
  });
}

async function cancelPendingEnrollmentWork(input: {
  organizationId: string;
  enrollmentId: string;
  stepExecutionId: string | null;
  reason: "recipient_complaint" | "recipient_hard_bounce";
}) {
  const supabase = createServiceClient() as SupabaseLike;
  const nowIso = new Date().toISOString();

  await supabase
    .from("email_sequence_enrollments")
    .update({
      status: "stopped",
      stop_reason: input.reason,
      stopped_at: nowIso,
    })
    .eq("organization_id", input.organizationId)
    .eq("id", input.enrollmentId);

  await supabase
    .from("email_queue_jobs")
    .update({
      status: "cancelled",
      completed_at: nowIso,
      error_code: input.reason,
      error_message: `Stopped due to ${input.reason.replaceAll("_", " ")}`,
    })
    .eq("organization_id", input.organizationId)
    .eq("enrollment_id", input.enrollmentId)
    .in("status", ["pending", "scheduled", "available", "locked", "processing", "retry"]);

  await supabase.from("email_execution_stop_events").insert({
    organization_id: input.organizationId,
    enrollment_id: input.enrollmentId,
    step_execution_id: input.stepExecutionId,
    rule_type:
      input.reason === "recipient_complaint"
        ? "stop_on_complaint"
        : "stop_on_hard_bounce",
    rule_code: input.reason,
    stop_reason: input.reason,
    source: "provider_event",
    evaluated_at: nowIso,
    result_json: {
      source: "provider_event",
      reason: input.reason,
    } as unknown as Json,
  });
}

async function upsertSuppression(input: {
  organizationId: string;
  email: string | null;
  normalizedType: NormalizedProviderEventType;
}) {
  if (!input.email) return;
  if (
    input.normalizedType !== "hard_bounced" &&
    input.normalizedType !== "complained"
  ) {
    return;
  }

  const supabase = createServiceClient() as SupabaseLike;
  const emailNormalized = normalizeSuppressionEmail(input.email);

  const status = input.normalizedType === "complained" ? "complaint" : "invalid_email";
  const reason = input.normalizedType === "complained" ? "complaint" : "bounce_hard";

  await supabase.from("email_suppressions").upsert(
    {
      organization_id: input.organizationId,
      email_normalized: emailNormalized,
      status,
      reason,
      source: "resend_webhook",
      notes: `Suppressed from provider event ${input.normalizedType}`,
    },
    {
      onConflict: "organization_id,email_normalized",
    },
  );
}

async function refreshCampaignExecutionCounters(campaignExecutionId: string) {
  const supabase = createServiceClient() as SupabaseLike;
  const { data: rows } = await supabase
    .from("email_message_delivery_status")
    .select("current_status")
    .eq("campaign_execution_id", campaignExecutionId);

  const counts = {
    accepted: 0,
    sent: 0,
    delivered: 0,
    delayed: 0,
    soft: 0,
    hard: 0,
    complained: 0,
    rejected: 0,
    failed: 0,
  };

  for (const row of rows ?? []) {
    const status = row.current_status;
    if (status === "accepted") counts.accepted += 1;
    if (status === "sent") counts.sent += 1;
    if (status === "delivered") counts.delivered += 1;
    if (status === "delayed") counts.delayed += 1;
    if (status === "soft_bounced") counts.soft += 1;
    if (status === "hard_bounced") counts.hard += 1;
    if (status === "complained") counts.complained += 1;
    if (status === "rejected") counts.rejected += 1;
    if (status === "failed") counts.failed += 1;
  }

  await supabase
    .from("email_campaign_executions")
    .update({
      accepted_message_count: counts.accepted,
      sent_message_count: counts.sent,
      delivered_message_count: counts.delivered,
      delayed_message_count: counts.delayed,
      soft_bounce_count: counts.soft,
      hard_bounce_count: counts.hard,
      complaint_count: counts.complained,
      rejection_count: counts.rejected,
      delivery_failure_count: counts.failed,
    })
    .eq("id", campaignExecutionId);
}

export async function persistAndProcessProviderEvent(input: {
  normalized: NormalizedProviderEvent;
}) {
  const supabase = createServiceClient() as SupabaseLike;

  const { data: existing } = await supabase
    .from("email_provider_events")
    .select("id")
    .or(
      `provider_event_id.eq.${input.normalized.providerEventId},payload_fingerprint.eq.${input.normalized.payloadFingerprint}`,
    )
    .eq("provider", input.normalized.provider)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from("email_provider_events")
      .update({
        duplicate_flag: true,
        processing_status: "duplicate",
      })
      .eq("id", existing.id);
    return { ok: true, duplicate: true as const, providerEventId: existing.id };
  }

  const providerEventInsert = {
    organization_id: null,
    provider: input.normalized.provider,
    provider_event_id: input.normalized.providerEventId,
    provider_message_id: input.normalized.providerMessageId,
    event_type: input.normalized.eventType,
    normalized_event_type: input.normalized.normalizedEventType,
    raw_payload: input.normalized.rawPayload as unknown as Json,
    payload_fingerprint: input.normalized.payloadFingerprint,
    signature_verification_status: "verified",
    received_at: new Date().toISOString(),
    provider_event_timestamp: input.normalized.providerEventTimestamp,
    processing_status: "pending",
    correlation_status: "unmatched",
    duplicate_flag: false,
    attempt_count: 1,
  };

  const { data: providerEventRow, error: insertError } = await supabase
    .from("email_provider_events")
    .insert(providerEventInsert)
    .select("*")
    .single();

  if (insertError || !providerEventRow) {
    return {
      ok: false,
      duplicate: false as const,
      error: insertError?.message ?? "Failed to persist provider event",
    };
  }

  const { data: queueRow } = await supabase
    .from("email_queue")
    .select(
      "id, organization_id, campaign_id, campaign_execution_id, enrollment_id, step_execution_id, recipient_id, provider_code, provider_message_id, status",
    )
    .eq("provider_code", input.normalized.provider)
    .eq("provider_message_id", input.normalized.providerMessageId ?? "")
    .maybeSingle();

  if (!queueRow) {
    await supabase
      .from("email_provider_events")
      .update({
        processing_status: "needs_review",
        correlation_status: "unmatched",
        processed_at: new Date().toISOString(),
      })
      .eq("id", providerEventRow.id);
    return { ok: true, duplicate: false as const, providerEventId: providerEventRow.id };
  }

  await supabase
    .from("email_provider_events")
    .update({
      organization_id: queueRow.organization_id,
      queue_item_id: queueRow.id,
      campaign_execution_id: queueRow.campaign_execution_id,
      enrollment_id: queueRow.enrollment_id,
      step_execution_id: queueRow.step_execution_id,
      recipient_id: queueRow.recipient_id,
      correlation_status: "matched",
    })
    .eq("id", providerEventRow.id);

  await upsertDeliveryStatus({
    queueRow: queueRow as unknown as QueueDispatchRow,
    providerEventRowId: providerEventRow.id,
    normalized: input.normalized,
  });

  const nextQueueStatus = mapQueueStatus(input.normalized.normalizedEventType);
  if (nextQueueStatus) {
    await supabase
      .from("email_queue")
      .update({
        status: nextQueueStatus,
        provider_status: input.normalized.providerStatus,
        failed_at:
          nextQueueStatus === "failed" || nextQueueStatus === "rejected"
            ? new Date().toISOString()
            : null,
      })
      .eq("id", queueRow.id);
  }

  await insertFoundationEmailEvent({
    queueRow: queueRow as unknown as QueueDispatchRow,
    normalized: input.normalized,
  });

  await upsertSuppression({
    organizationId: queueRow.organization_id,
    email: input.normalized.recipientEmail,
    normalizedType: input.normalized.normalizedEventType,
  });

  if (
    queueRow.enrollment_id &&
    (input.normalized.normalizedEventType === "complained" ||
      input.normalized.normalizedEventType === "hard_bounced")
  ) {
    await cancelPendingEnrollmentWork({
      organizationId: queueRow.organization_id,
      enrollmentId: queueRow.enrollment_id,
      stepExecutionId: queueRow.step_execution_id,
      reason:
        input.normalized.normalizedEventType === "complained"
          ? "recipient_complaint"
          : "recipient_hard_bounce",
    });
  }

  if (queueRow.campaign_execution_id) {
    await refreshCampaignExecutionCounters(queueRow.campaign_execution_id);
  }

  await supabase
    .from("email_provider_events")
    .update({
      processing_status: "processed",
      processed_at: new Date().toISOString(),
    })
    .eq("id", providerEventRow.id);

  return { ok: true, duplicate: false as const, providerEventId: providerEventRow.id };
}

