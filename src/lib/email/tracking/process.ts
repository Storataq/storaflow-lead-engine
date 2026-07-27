/* eslint-disable @typescript-eslint/no-explicit-any */

import { createHash } from "crypto";

import type { Json } from "@/types/supabase";
import { createServiceClient } from "@/lib/supabase/admin";
import { parseTrackedReplyToAddress } from "@/lib/email/tracking/tokens";

type SupabaseLike = any;

type QueueTrackingRow = {
  id: string;
  organization_id: string;
  campaign_id: string | null;
  campaign_execution_id: string | null;
  enrollment_id: string | null;
  step_execution_id: string | null;
  rendered_message_id: string | null;
  recipient_id: string;
  status: string;
};

type TrackingEventType = "opened" | "clicked" | "replied";

function hashValue(value: string | null | undefined): string | null {
  if (!value) return null;
  const secret = process.env.EMAIL_TRACKING_SECRET?.trim();
  if (!secret) {
    // Fail closed: do not hash with a weak default secret.
    return null;
  }
  return createHash("sha256").update(`${secret}:${value}`).digest("hex");
}

function dedupeKey(input: {
  eventType: TrackingEventType;
  queueItemId: string;
  trackingLinkId?: string | null;
  ipHash?: string | null;
  userAgentHash?: string | null;
  providerEventId?: string | null;
  occurredAtIso: string;
}) {
  if (input.eventType === "replied" && input.providerEventId) {
    return `reply:${input.queueItemId}:${input.providerEventId}`;
  }

  const dateBucket = input.occurredAtIso.slice(0, 10);
  return [
    input.eventType,
    input.queueItemId,
    input.trackingLinkId ?? "none",
    input.ipHash ?? "no-ip",
    input.userAgentHash ?? "no-ua",
    dateBucket,
  ].join(":");
}

async function refreshEngagementCounters(campaignExecutionId: string) {
  const supabase = createServiceClient() as SupabaseLike;
  const { data } = await supabase
    .from("email_message_engagement_status")
    .select("unique_open_count, total_open_count, unique_click_count, total_click_count, reply_count")
    .eq("campaign_execution_id", campaignExecutionId);

  let opened = 0;
  let uniqueOpened = 0;
  let clicked = 0;
  let uniqueClicked = 0;
  let replied = 0;

  for (const row of data ?? []) {
    if ((row.total_open_count ?? 0) > 0) opened += 1;
    uniqueOpened += row.unique_open_count ?? 0;
    if ((row.total_click_count ?? 0) > 0) clicked += 1;
    uniqueClicked += row.unique_click_count ?? 0;
    if ((row.reply_count ?? 0) > 0) replied += 1;
  }

  await supabase
    .from("email_campaign_executions")
    .update({
      opened_message_count: opened,
      unique_opened_message_count: uniqueOpened,
      clicked_message_count: clicked,
      unique_clicked_message_count: uniqueClicked,
      replied_message_count: replied,
    })
    .eq("id", campaignExecutionId);
}

async function syncEngagementStatus(input: {
  queueRow: QueueTrackingRow;
  eventType: TrackingEventType;
  occurredAtIso: string;
  providerEventId?: string | null;
}) {
  const supabase = createServiceClient() as SupabaseLike;
  const { data: existing } = await supabase
    .from("email_message_engagement_status")
    .select("*")
    .eq("queue_item_id", input.queueRow.id)
    .maybeSingle();

  const updatePayload =
    input.eventType === "opened"
      ? {
          first_opened_at: existing?.first_opened_at ?? input.occurredAtIso,
          last_opened_at: input.occurredAtIso,
          total_open_count: (existing?.total_open_count ?? 0) + 1,
          unique_open_count: existing?.first_opened_at ? existing.unique_open_count ?? 0 : 1,
        }
      : input.eventType === "clicked"
        ? {
            first_clicked_at: existing?.first_clicked_at ?? input.occurredAtIso,
            last_clicked_at: input.occurredAtIso,
            total_click_count: (existing?.total_click_count ?? 0) + 1,
            unique_click_count: existing?.first_clicked_at
              ? existing.unique_click_count ?? 0
              : 1,
          }
        : {
            replied_at: existing?.replied_at ?? input.occurredAtIso,
            reply_count: (existing?.reply_count ?? 0) + 1,
            last_reply_provider_event_id: input.providerEventId ?? null,
          };

  const basePayload = {
    organization_id: input.queueRow.organization_id,
    queue_item_id: input.queueRow.id,
    rendered_message_id: input.queueRow.rendered_message_id,
    campaign_id: input.queueRow.campaign_id,
    campaign_execution_id: input.queueRow.campaign_execution_id,
    enrollment_id: input.queueRow.enrollment_id,
    step_execution_id: input.queueRow.step_execution_id,
    recipient_id: input.queueRow.recipient_id,
  };

  if (existing) {
    await supabase
      .from("email_message_engagement_status")
      .update(updatePayload)
      .eq("queue_item_id", input.queueRow.id);
  } else {
    await supabase.from("email_message_engagement_status").insert({
      ...basePayload,
      first_opened_at: null,
      last_opened_at: null,
      total_open_count: 0,
      unique_open_count: 0,
      first_clicked_at: null,
      last_clicked_at: null,
      total_click_count: 0,
      unique_click_count: 0,
      replied_at: null,
      reply_count: 0,
      last_reply_provider_event_id: null,
      ...updatePayload,
    });
  }

  if (input.queueRow.campaign_execution_id) {
    await refreshEngagementCounters(input.queueRow.campaign_execution_id);
  }
}

async function logCrmEngagement(input: {
  queueRow: QueueTrackingRow;
  eventType: TrackingEventType;
  occurredAtIso: string;
}) {
  const supabase = createServiceClient() as SupabaseLike;
  const { data: recipient } = await supabase
    .from("email_recipients")
    .select("lead_id, contact_id, preferred_email, preferred_name")
    .eq("id", input.queueRow.recipient_id)
    .maybeSingle();

  const entityType = recipient?.lead_id ? "lead" : recipient?.contact_id ? "contact" : null;
  const entityId = recipient?.lead_id ?? recipient?.contact_id ?? null;
  if (!entityType || !entityId) return;

  await supabase.from("activity_events").insert({
    organization_id: input.queueRow.organization_id,
    user_id: null,
    event_type: `email_${input.eventType}`,
    entity_type: entityType,
    entity_id: entityId,
    description: `Email ${input.eventType} for ${recipient?.preferred_email ?? "recipient"}`,
    metadata_json: {
      queueItemId: input.queueRow.id,
      occurredAt: input.occurredAtIso,
      recipientName: recipient?.preferred_name ?? null,
    } as unknown as Json,
  });
}

async function stopEnrollmentOnReply(queueRow: QueueTrackingRow, occurredAtIso: string) {
  if (!queueRow.enrollment_id) return;

  const supabase = createServiceClient() as SupabaseLike;
  await supabase
    .from("email_sequence_enrollments")
    .update({
      status: "stopped",
      stop_reason: "recipient_replied",
      stopped_at: occurredAtIso,
    })
    .eq("organization_id", queueRow.organization_id)
    .eq("id", queueRow.enrollment_id);

  await supabase
    .from("email_queue_jobs")
    .update({
      status: "cancelled",
      completed_at: occurredAtIso,
      error_code: "recipient_replied",
      error_message: "Stopped because recipient replied",
    })
    .eq("organization_id", queueRow.organization_id)
    .eq("enrollment_id", queueRow.enrollment_id)
    .in("status", ["pending", "scheduled", "available", "locked", "processing", "retry"]);

  await supabase.from("email_execution_stop_events").insert({
    organization_id: queueRow.organization_id,
    enrollment_id: queueRow.enrollment_id,
    step_execution_id: queueRow.step_execution_id,
    rule_type: "stop_on_reply",
    rule_code: "recipient_replied",
    stop_reason: "recipient_replied",
    source: "tracking_reply",
    evaluated_at: occurredAtIso,
    result_json: {
      reason: "recipient_replied",
      queueItemId: queueRow.id,
    } as unknown as Json,
  });
}

export async function recordEngagementEvent(input: {
  queueRow: QueueTrackingRow;
  eventType: TrackingEventType;
  occurredAtIso?: string;
  trackingLinkId?: string | null;
  providerEventId?: string | null;
  referer?: string | null;
  targetUrl?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createServiceClient() as SupabaseLike;
  const occurredAtIso = input.occurredAtIso ?? new Date().toISOString();
  const ipHash = hashValue(input.ipAddress);
  const userAgentHash = hashValue(input.userAgent);
  const key = dedupeKey({
    eventType: input.eventType,
    queueItemId: input.queueRow.id,
    trackingLinkId: input.trackingLinkId,
    ipHash,
    userAgentHash,
    providerEventId: input.providerEventId,
    occurredAtIso,
  });

  const { data: existing } = await supabase
    .from("email_tracking_events")
    .select("id")
    .eq("organization_id", input.queueRow.organization_id)
    .eq("dedupe_key", key)
    .maybeSingle();

  if (existing?.id) {
    return { recorded: false, duplicate: true };
  }

  await supabase.from("email_tracking_events").insert({
    organization_id: input.queueRow.organization_id,
    queue_item_id: input.queueRow.id,
    rendered_message_id: input.queueRow.rendered_message_id,
    tracking_link_id: input.trackingLinkId ?? null,
    provider_event_id: input.providerEventId ?? null,
    campaign_execution_id: input.queueRow.campaign_execution_id,
    enrollment_id: input.queueRow.enrollment_id,
    step_execution_id: input.queueRow.step_execution_id,
    recipient_id: input.queueRow.recipient_id,
    event_type: input.eventType,
    dedupe_key: key,
    is_unique:
      input.eventType === "replied" ||
      input.eventType === "opened" ||
      input.eventType === "clicked",
    occurred_at: occurredAtIso,
    ip_hash: ipHash,
    user_agent_hash: userAgentHash,
    referer: input.referer ?? null,
    target_url: input.targetUrl ?? null,
    metadata_json: (input.metadata ?? {}) as unknown as Json,
  });

  await syncEngagementStatus({
    queueRow: input.queueRow,
    eventType: input.eventType,
    occurredAtIso,
    providerEventId: input.providerEventId,
  });

  const queueStatus =
    input.eventType === "replied"
      ? "replied"
      : input.eventType === "clicked"
        ? "clicked"
        : "opened";

  await supabase
    .from("email_queue")
    .update({ status: queueStatus })
    .eq("id", input.queueRow.id);

  await supabase.from("email_events").insert({
    organization_id: input.queueRow.organization_id,
    queue_item_id: input.queueRow.id,
    recipient_id: input.queueRow.recipient_id,
    campaign_id: input.queueRow.campaign_id,
    event_type:
      input.eventType === "opened"
        ? "email_opened"
        : input.eventType === "clicked"
          ? "email_clicked"
          : "email_replied",
    payload_json: {
      referer: input.referer ?? null,
      targetUrl: input.targetUrl ?? null,
      metadata: input.metadata ?? {},
    } as unknown as Json,
    occurred_at: occurredAtIso,
  });

  await logCrmEngagement({
    queueRow: input.queueRow,
    eventType: input.eventType,
    occurredAtIso,
  });

  if (input.eventType === "replied") {
    await stopEnrollmentOnReply(input.queueRow, occurredAtIso);
  }

  return { recorded: true, duplicate: false };
}

export async function getQueueRowForOpenTracking(input: {
  queueItemId: string;
  renderedMessageId: string;
}): Promise<QueueTrackingRow | null> {
  const supabase = createServiceClient() as SupabaseLike;
  const { data } = await supabase
    .from("email_queue")
    .select(
      "id, organization_id, campaign_id, campaign_execution_id, enrollment_id, step_execution_id, rendered_message_id, recipient_id, status",
    )
    .eq("id", input.queueItemId)
    .eq("rendered_message_id", input.renderedMessageId)
    .maybeSingle();
  return (data as QueueTrackingRow | null) ?? null;
}

export async function getTrackingLinkByToken(token: string) {
  const supabase = createServiceClient() as SupabaseLike;
  const { data: link } = await supabase
    .from("email_tracking_links")
    .select("*")
    .eq("public_token", token)
    .maybeSingle();

  if (!link?.queue_item_id) return null;

  const { data: queueRow } = await supabase
    .from("email_queue")
    .select(
      "id, organization_id, campaign_id, campaign_execution_id, enrollment_id, step_execution_id, rendered_message_id, recipient_id, status",
    )
    .eq("id", link.queue_item_id)
    .maybeSingle();

  if (!queueRow) return null;

  return {
    ...(queueRow as QueueTrackingRow),
    original_url: link.original_url,
    tracking_link_id: link.id,
  };
}

export async function recordReplyFromReceivedWebhook(input: {
  providerEventId: string;
  fromEmail: string | null;
  toEmail: string | null;
  occurredAtIso?: string | null;
  subject?: string | null;
}) {
  const queueItemId = parseTrackedReplyToAddress(input.toEmail);
  if (!queueItemId) {
    return { recorded: false, reason: "not_tracked_reply_address" as const };
  }

  const supabase = createServiceClient() as SupabaseLike;
  const { data: queueRow } = await supabase
    .from("email_queue")
    .select(
      "id, organization_id, campaign_id, campaign_execution_id, enrollment_id, step_execution_id, rendered_message_id, recipient_id, status",
    )
    .eq("id", queueItemId)
    .maybeSingle();

  if (!queueRow) {
    return { recorded: false, reason: "queue_not_found" as const };
  }

  const engagement = await recordEngagementEvent({
    queueRow: queueRow as QueueTrackingRow,
    eventType: "replied",
    providerEventId: input.providerEventId,
    occurredAtIso: input.occurredAtIso ?? new Date().toISOString(),
    metadata: {
      fromEmail: input.fromEmail,
      toEmail: input.toEmail,
      subject: input.subject,
    },
  });

  // High-confidence explicit unsubscribe reply heuristics (subject-only; body not in webhook).
  const subject = (input.subject ?? "").toLowerCase();
  const highConfidenceUnsubscribe =
    /\bunsubscribe\b/.test(subject) ||
    /\bremove me\b/.test(subject) ||
    /\bstop emails?\b/.test(subject) ||
    /\bopt[ -]?out\b/.test(subject) ||
    /\bafmelden\b/.test(subject);

  if (highConfidenceUnsubscribe) {
    const { data: recipient } = await supabase
      .from("email_recipients")
      .select("preferred_email, contact_id, lead_id, company_id")
      .eq("id", queueRow.recipient_id)
      .maybeSingle();

    if (recipient?.preferred_email) {
      const { processUnsubscribe } = await import("@/lib/email/preferences/service");
      await processUnsubscribe({
        organizationId: queueRow.organization_id,
        emailNormalized: recipient.preferred_email,
        scope: "organization",
        source: "inbound_reply",
        relatedQueueItemId: queueRow.id,
        campaignId: queueRow.campaign_id,
        contactId: recipient.contact_id,
        leadId: recipient.lead_id,
        companyId: recipient.company_id,
        idempotencyKey: `reply-unsub:${input.providerEventId}`,
        reasonCode: "no_longer_interested",
        reasonText: input.subject,
      });
    }
  } else if (subject.includes("stop") || subject.includes("no more")) {
    // Low-confidence: mark needs review via preference event; stop enrollment conservatively via reply handler already.
    await supabase.from("email_preference_events").insert({
      organization_id: queueRow.organization_id,
      preference_id: null,
      email_normalized: (input.fromEmail ?? "unknown").toLowerCase(),
      event_type: "manual_review_required",
      source: "inbound_reply",
      idempotency_key: `reply-review:${input.providerEventId}`,
      payload_json: {
        subject: input.subject,
        queueItemId: queueRow.id,
        confidence: "low",
      },
    });
  }

  return engagement;
}

