/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Unsubscribe + preference update service — Phase 21I.
 */

import type { Json } from "@/types/supabase";
import { createServiceClient } from "@/lib/supabase/admin";
import { normalizeSuppressionEmail } from "@/lib/email/suppression";
import {
  DEFAULT_COMMUNICATION_CATEGORIES,
  FREQUENCY_DEFAULTS,
  FOOTER_VERSION,
  MANDATORY_SUPPRESSION_REASONS,
  SUPPRESSION_PRECEDENCE,
  type CommunicationFrequency,
  type PreferenceUpdateRequest,
  type UnsubscribeCommand,
  type UnsubscribeResult,
} from "@/lib/email/preferences/constants";
import {
  canResubscribe,
  resolveEffectiveCommunicationStatus,
  type PreferenceInput,
  type SuppressionInput,
} from "@/lib/email/preferences/resolver";
import {
  buildOneClickUnsubscribeUrl,
  buildPreferenceCenterUrl,
  buildResubscribeUrl,
  buildUnsubscribePageUrl,
  createOpaquePublicToken,
  getPreferenceBaseUrl,
  hashPreferenceMeta,
  signPreferenceAccessToken,
  ttlDays,
  ttlHours,
  verifyPreferenceAccessToken,
} from "@/lib/email/preferences/tokens";

type SupabaseLike = any;

function nowIso(): string {
  return new Date().toISOString();
}

function addDays(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

function addHours(hours: number): string {
  const d = new Date();
  d.setUTCHours(d.getUTCHours() + hours);
  return d.toISOString();
}

async function ensureDefaultCategories(organizationId: string) {
  const supabase = createServiceClient() as SupabaseLike;
  for (const cat of DEFAULT_COMMUNICATION_CATEGORIES) {
    await supabase.from("email_communication_categories").upsert(
      {
        organization_id: organizationId,
        code: cat.code,
        name: cat.name,
        is_essential: cat.isEssential,
        is_active: true,
        default_subscribed: cat.defaultSubscribed,
        display_order: cat.displayOrder,
      },
      { onConflict: "organization_id,code" },
    );
  }
}

async function ensurePreferenceRow(input: {
  organizationId: string;
  emailNormalized: string;
  contactId?: string | null;
  leadId?: string | null;
  companyId?: string | null;
  source?: string;
}) {
  const supabase = createServiceClient() as SupabaseLike;
  const { data: existing } = await supabase
    .from("email_recipient_preferences")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("email_normalized", input.emailNormalized)
    .maybeSingle();

  if (existing) return existing;

  const categoryDefaults: Record<string, boolean> = {};
  for (const cat of DEFAULT_COMMUNICATION_CATEGORIES) {
    categoryDefaults[cat.code] = cat.defaultSubscribed;
  }

  const { data: created } = await supabase
    .from("email_recipient_preferences")
    .insert({
      organization_id: input.organizationId,
      email_normalized: input.emailNormalized,
      contact_id: input.contactId ?? null,
      lead_id: input.leadId ?? null,
      company_id: input.companyId ?? null,
      category_preferences_json: categoryDefaults,
      source: input.source ?? "system",
      effective_status: "subscribed",
      eligible_for_outreach: true,
    })
    .select("*")
    .single();

  return created;
}

async function writePreferenceEvent(input: {
  organizationId: string;
  preferenceId: string | null;
  emailNormalized: string;
  eventType: string;
  scope?: string | null;
  categoryCode?: string | null;
  campaignId?: string | null;
  sequenceId?: string | null;
  source?: string | null;
  idempotencyKey?: string | null;
  payload?: Record<string, unknown>;
  ipHash?: string | null;
  userAgentHash?: string | null;
}) {
  const supabase = createServiceClient() as SupabaseLike;
  if (input.idempotencyKey) {
    const { data: existing } = await supabase
      .from("email_preference_events")
      .select("id")
      .eq("organization_id", input.organizationId)
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle();
    if (existing?.id) return { duplicate: true, id: existing.id };
  }

  const { data } = await supabase
    .from("email_preference_events")
    .insert({
      organization_id: input.organizationId,
      preference_id: input.preferenceId,
      email_normalized: input.emailNormalized,
      event_type: input.eventType,
      scope: input.scope ?? null,
      category_code: input.categoryCode ?? null,
      campaign_id: input.campaignId ?? null,
      sequence_id: input.sequenceId ?? null,
      source: input.source ?? null,
      idempotency_key: input.idempotencyKey ?? null,
      payload_json: (input.payload ?? {}) as unknown as Json,
      ip_hash: input.ipHash ?? null,
      user_agent_hash: input.userAgentHash ?? null,
    })
    .select("id")
    .single();

  return { duplicate: false, id: data?.id ?? null };
}

async function writeCrmActivity(input: {
  organizationId: string;
  leadId?: string | null;
  contactId?: string | null;
  eventType: string;
  description: string;
  metadata?: Record<string, unknown>;
}) {
  const entityType = input.leadId ? "lead" : input.contactId ? "contact" : null;
  const entityId = input.leadId ?? input.contactId ?? null;
  if (!entityType || !entityId) return false;

  const supabase = createServiceClient() as SupabaseLike;
  await supabase.from("activity_events").insert({
    organization_id: input.organizationId,
    user_id: null,
    event_type: input.eventType,
    entity_type: entityType,
    entity_id: entityId,
    description: input.description,
    metadata_json: (input.metadata ?? {}) as unknown as Json,
  });
  return true;
}

export async function cancelFutureEmailWorkForRecipient(input: {
  organizationId: string;
  emailNormalized: string;
  stopReason: string;
  source: string;
  categoryCode?: string | null;
}) {
  const supabase = createServiceClient() as SupabaseLike;
  const now = nowIso();

  const { data: recipients } = await supabase
    .from("email_recipients")
    .select("id")
    .eq("organization_id", input.organizationId)
    .ilike("preferred_email", input.emailNormalized);

  const recipientIds = (recipients ?? []).map((r: { id: string }) => r.id);
  if (recipientIds.length === 0) {
    return { enrollmentsStopped: 0, queueJobsCancelled: 0 };
  }

  const { data: enrollments } = await supabase
    .from("email_sequence_enrollments")
    .select("id, status")
    .eq("organization_id", input.organizationId)
    .in("recipient_snapshot_id", recipientIds)
    .in("status", ["pending", "scheduled", "active", "waiting", "paused"]);

  let enrollmentsStopped = 0;
  let queueJobsCancelled = 0;

  for (const enrollment of enrollments ?? []) {
    await supabase
      .from("email_sequence_enrollments")
      .update({
        status: input.stopReason === "temporary_pause" ? "paused" : "stopped",
        stop_reason: input.stopReason,
        stopped_at: now,
      })
      .eq("id", enrollment.id)
      .eq("organization_id", input.organizationId);

    await supabase.from("email_execution_stop_events").insert({
      organization_id: input.organizationId,
      enrollment_id: enrollment.id,
      step_execution_id: null,
      rule_type:
        input.stopReason === "temporary_pause"
          ? "temporary_pause"
          : "stop_on_unsubscribe",
      rule_code: input.stopReason,
      stop_reason: input.stopReason,
      source: input.source,
      evaluated_at: now,
      result_json: {
        emailNormalized: input.emailNormalized,
        categoryCode: input.categoryCode ?? null,
      } as unknown as Json,
    });

    const { data: jobs } = await supabase
      .from("email_queue_jobs")
      .update({
        status: "cancelled",
        cancelled_at: now,
        error_code: input.stopReason,
        error_message: `Cancelled by preference/suppression: ${input.stopReason}`,
      })
      .eq("organization_id", input.organizationId)
      .eq("enrollment_id", enrollment.id)
      .in("status", [
        "pending",
        "scheduled",
        "available",
        "locked",
        "processing",
        "retry",
      ])
      .select("id");

    enrollmentsStopped += 1;
    queueJobsCancelled += (jobs ?? []).length;
  }

  // Also cancel outbound email_queue rows still waiting to send.
  await supabase
    .from("email_queue")
    .update({
      status: "cancelled",
      last_error: `Cancelled by preference/suppression: ${input.stopReason}`,
    })
    .eq("organization_id", input.organizationId)
    .in("recipient_id", recipientIds)
    .in("status", ["queued", "waiting", "scheduled", "sending"]);

  return { enrollmentsStopped, queueJobsCancelled };
}

async function upsertSuppressionRecord(input: {
  organizationId: string;
  emailNormalized: string;
  status: string;
  reason: string;
  source: string;
  scope: string;
  permanentFlag?: boolean;
  expiresAt?: string | null;
  categoryCode?: string | null;
  campaignId?: string | null;
  sequenceId?: string | null;
  contactId?: string | null;
  leadId?: string | null;
  companyId?: string | null;
  relatedMessageId?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  evidence?: Record<string, unknown>;
}) {
  const supabase = createServiceClient() as SupabaseLike;
  const precedence = SUPPRESSION_PRECEDENCE[input.reason] ?? 100;

  const { data: existing } = await supabase
    .from("email_suppressions")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("email_normalized", input.emailNormalized)
    .maybeSingle();

  const existingRank = existing?.precedence_rank ?? Number.POSITIVE_INFINITY;
  // Do not let a weaker suppression overwrite a stronger active one.
  if (
    existing?.active !== false &&
    existing &&
    existingRank < precedence &&
    MANDATORY_SUPPRESSION_REASONS.has(existing.reason)
  ) {
    return { upserted: false, id: existing.id as string, blockedByStronger: true };
  }

  const payload = {
    organization_id: input.organizationId,
    email_normalized: input.emailNormalized,
    status: input.status,
    reason: input.reason,
    source: input.source,
    notes: input.notes ?? null,
    scope: input.scope,
    permanent_flag: input.permanentFlag ?? true,
    expires_at: input.expiresAt ?? null,
    category_code: input.categoryCode ?? null,
    campaign_id: input.campaignId ?? null,
    sequence_id: input.sequenceId ?? null,
    contact_id: input.contactId ?? null,
    lead_id: input.leadId ?? null,
    company_id: input.companyId ?? null,
    related_message_id: input.relatedMessageId ?? null,
    evidence_json: (input.evidence ?? {}) as unknown as Json,
    precedence_rank: precedence,
    active: true,
    created_by: input.createdBy ?? null,
    removed_by: null,
    removed_at: null,
    removal_reason: null,
  };

  let suppressionId: string;
  if (existing) {
    await supabase
      .from("email_suppressions")
      .update(payload)
      .eq("id", existing.id);
    suppressionId = existing.id;
  } else {
    const { data } = await supabase
      .from("email_suppressions")
      .insert(payload)
      .select("id")
      .single();
    suppressionId = data.id;
  }

  await supabase.from("email_suppression_history").insert({
    organization_id: input.organizationId,
    suppression_id: suppressionId,
    email_normalized: input.emailNormalized,
    action: existing ? "updated" : "created",
    status: input.status,
    reason: input.reason,
    source: input.source,
    scope: input.scope,
    permanent_flag: input.permanentFlag ?? true,
    evidence_json: (input.evidence ?? {}) as unknown as Json,
    notes: input.notes ?? null,
    actor_user_id: input.createdBy ?? null,
  });

  return { upserted: true, id: suppressionId, blockedByStronger: false };
}

export async function recalculateAndPersistEffectiveStatus(input: {
  organizationId: string;
  emailNormalized: string;
  categoryCode?: string | null;
  campaignId?: string | null;
  sequenceId?: string | null;
}) {
  const supabase = createServiceClient() as SupabaseLike;
  const [{ data: suppressions }, { data: preference }] = await Promise.all([
    supabase
      .from("email_suppressions")
      .select("*")
      .eq("organization_id", input.organizationId)
      .eq("email_normalized", input.emailNormalized)
      .eq("active", true),
    supabase
      .from("email_recipient_preferences")
      .select("*")
      .eq("organization_id", input.organizationId)
      .eq("email_normalized", input.emailNormalized)
      .maybeSingle(),
  ]);

  const suppressionInputs: SuppressionInput[] = (suppressions ?? []).map(
    (row: any) => ({
      id: row.id,
      status: row.status,
      reason: row.reason,
      scope: row.scope,
      active: row.active,
      permanentFlag: row.permanent_flag,
      expiresAt: row.expires_at,
      categoryCode: row.category_code,
      campaignId: row.campaign_id,
      sequenceId: row.sequence_id,
      precedenceRank: row.precedence_rank,
    }),
  );

  const preferenceInput: PreferenceInput | null = preference
    ? {
        effectiveStatus: preference.effective_status,
        frequencyType: preference.frequency_type,
        categoryPreferences: preference.category_preferences_json ?? {},
        pauseStartsAt: preference.pause_starts_at,
        pauseEndsAt: preference.pause_ends_at,
        doNotContact: preference.do_not_contact,
        globalUnsubscribedAt: preference.global_unsubscribed_at,
        minDaysBetweenEmails: preference.min_days_between_emails,
        maxEmailsPerWeek: preference.max_emails_per_week,
        maxEmailsPerMonth: preference.max_emails_per_month,
      }
    : null;

  const decision = resolveEffectiveCommunicationStatus({
    suppressions: suppressionInputs,
    preference: preferenceInput,
    categoryCode: input.categoryCode,
    campaignId: input.campaignId,
    sequenceId: input.sequenceId,
  });

  if (preference) {
    await supabase
      .from("email_recipient_preferences")
      .update({
        effective_status: decision.effectiveStatus,
        eligible_for_outreach: decision.eligible,
        eligibility_reason: decision.blockingReasons.join("; ") || null,
        last_preference_update_at: nowIso(),
      })
      .eq("id", preference.id);
  }

  await supabase.from("email_effective_communication_status").upsert(
    {
      organization_id: input.organizationId,
      email_normalized: input.emailNormalized,
      preference_id: preference?.id ?? null,
      effective_status: decision.effectiveStatus,
      eligible: decision.eligible,
      blocking_reasons_json: decision.blockingReasons as unknown as Json,
      warning_reasons_json: decision.warningReasons as unknown as Json,
      next_eligible_at: decision.nextEligibleAt,
      strongest_suppression_id:
        suppressionInputs.find((s) => s.reason === decision.strongestSuppressionReason)
          ?.id ?? null,
      applied_rules_json: decision.appliedRules as unknown as Json,
      evaluated_at: decision.evaluatedAt,
    },
    { onConflict: "organization_id,email_normalized" },
  );

  return decision;
}

export async function processUnsubscribe(
  command: UnsubscribeCommand,
): Promise<UnsubscribeResult> {
  const supabase = createServiceClient() as SupabaseLike;
  const emailNormalized = normalizeSuppressionEmail(command.emailNormalized);

  const { data: existingUnsub } = await supabase
    .from("email_unsubscribe_events")
    .select("id, side_effects_json")
    .eq("organization_id", command.organizationId)
    .eq("idempotency_key", command.idempotencyKey)
    .maybeSingle();

  if (existingUnsub) {
    const decision = await recalculateAndPersistEffectiveStatus({
      organizationId: command.organizationId,
      emailNormalized,
      categoryCode: command.categoryCode,
      campaignId: command.campaignId,
      sequenceId: command.sequenceId,
    });
    return {
      success: true,
      message: "Unsubscribe already processed",
      effectiveStatus: decision.effectiveStatus,
      sideEffects: {
        preferenceUpdated: false,
        suppressionUpserted: false,
        enrollmentsStopped: 0,
        queueJobsCancelled: 0,
        crmActivityWritten: false,
        alreadyProcessed: true,
      },
    };
  }

  await ensureDefaultCategories(command.organizationId);
  const preference = await ensurePreferenceRow({
    organizationId: command.organizationId,
    emailNormalized,
    contactId: command.contactId,
    leadId: command.leadId,
    companyId: command.companyId,
    source: command.source,
  });

  const isGlobal =
    command.scope === "organization" || command.scope === "legal";
  const isPause = command.scope === "temporary_pause";

  const categoryPreferences = {
    ...((preference.category_preferences_json as Record<string, boolean>) ?? {}),
  };
  if (command.scope === "category" && command.categoryCode) {
    categoryPreferences[command.categoryCode] = false;
  }
  if (isGlobal) {
    for (const cat of DEFAULT_COMMUNICATION_CATEGORIES) {
      if (!cat.isEssential) categoryPreferences[cat.code] = false;
    }
  }

  const preferenceUpdate: Record<string, unknown> = {
    category_preferences_json: categoryPreferences,
    last_preference_update_at: nowIso(),
    source: command.source,
  };

  if (isGlobal) {
    preferenceUpdate.global_unsubscribed_at = nowIso();
    preferenceUpdate.last_unsubscribe_at = nowIso();
    preferenceUpdate.do_not_contact = false;
    preferenceUpdate.eligible_for_outreach = false;
  }
  if (isPause) {
    preferenceUpdate.pause_starts_at = nowIso();
    preferenceUpdate.pause_ends_at = addDays(30);
    preferenceUpdate.pause_scope = "organization";
    preferenceUpdate.pause_reason = command.reasonText ?? "recipient_pause";
  }

  await supabase
    .from("email_recipient_preferences")
    .update(preferenceUpdate)
    .eq("id", preference.id);

  let suppressionUpserted = false;
  if (isGlobal || command.scope === "category" || command.scope === "campaign" || command.scope === "sequence") {
    const reason =
      command.scope === "category"
        ? "unsubscribed"
        : command.scope === "campaign" || command.scope === "sequence"
          ? "unsubscribed"
          : "unsubscribed";
    const status = isGlobal ? "unsubscribed" : "suppressed";
    const result = await upsertSuppressionRecord({
      organizationId: command.organizationId,
      emailNormalized,
      status,
      reason,
      source: command.source,
      scope: command.scope === "legal" ? "legal" : command.scope,
      permanentFlag: isGlobal,
      categoryCode: command.categoryCode,
      campaignId: command.campaignId,
      sequenceId: command.sequenceId,
      contactId: command.contactId,
      leadId: command.leadId,
      companyId: command.companyId,
      relatedMessageId: command.relatedQueueItemId,
      notes: command.reasonText ?? null,
      evidence: {
        reasonCode: command.reasonCode ?? "no_reason_provided",
      },
    });
    suppressionUpserted = result.upserted;
  }

  const stopReason = isPause
    ? "temporary_pause"
    : isGlobal
      ? "recipient_unsubscribed"
      : command.scope === "category"
        ? "category_unsubscribed"
        : "recipient_unsubscribed";

  const cancelResult = await cancelFutureEmailWorkForRecipient({
    organizationId: command.organizationId,
    emailNormalized,
    stopReason,
    source: command.source,
    categoryCode: command.categoryCode,
  });

  // Sync recipient snapshot suppression status for stop-rules compatibility.
  if (isGlobal) {
    await supabase
      .from("email_recipients")
      .update({ suppression_status: "unsubscribed" })
      .eq("organization_id", command.organizationId)
      .ilike("preferred_email", emailNormalized);
  }

  await supabase.from("email_events").insert({
    organization_id: command.organizationId,
    queue_item_id: command.relatedQueueItemId ?? null,
    recipient_id: null,
    campaign_id: command.campaignId ?? null,
    event_type: "recipient_unsubscribed",
    payload_json: {
      scope: command.scope,
      categoryCode: command.categoryCode ?? null,
      source: command.source,
    } as unknown as Json,
    occurred_at: nowIso(),
  });

  const sideEffects = {
    preferenceUpdated: true,
    suppressionUpserted,
    enrollmentsStopped: cancelResult.enrollmentsStopped,
    queueJobsCancelled: cancelResult.queueJobsCancelled,
    crmActivityWritten: false,
    alreadyProcessed: false,
  };

  await supabase.from("email_unsubscribe_events").insert({
    organization_id: command.organizationId,
    preference_id: preference.id,
    email_normalized: emailNormalized,
    scope: command.scope === "legal" ? "organization" : command.scope,
    category_code: command.categoryCode ?? null,
    campaign_id: command.campaignId ?? null,
    sequence_id: command.sequenceId ?? null,
    reason_code: command.reasonCode ?? "no_reason_provided",
    reason_text: command.reasonText ?? null,
    source: command.source,
    related_queue_item_id: command.relatedQueueItemId ?? null,
    idempotency_key: command.idempotencyKey,
    side_effects_json: sideEffects as unknown as Json,
  });

  await writePreferenceEvent({
    organizationId: command.organizationId,
    preferenceId: preference.id,
    emailNormalized,
    eventType: isGlobal
      ? command.source === "one_click_unsubscribe"
        ? "one_click_unsubscribe"
        : "global_unsubscribe"
      : command.scope === "category"
        ? "category_unsubscribe"
        : isPause
          ? "temporary_pause"
          : "preference_updated",
    scope: command.scope,
    categoryCode: command.categoryCode,
    campaignId: command.campaignId,
    sequenceId: command.sequenceId,
    source: command.source,
    idempotencyKey: `pref:${command.idempotencyKey}`,
    payload: { reasonCode: command.reasonCode },
    ipHash: command.ipHash,
    userAgentHash: command.userAgentHash,
  });

  const crmWritten = await writeCrmActivity({
    organizationId: command.organizationId,
    leadId: command.leadId ?? preference.lead_id,
    contactId: command.contactId ?? preference.contact_id,
    eventType: "email_unsubscribed",
    description: `Recipient unsubscribed (${command.scope})`,
    metadata: {
      scope: command.scope,
      source: command.source,
      categoryCode: command.categoryCode ?? null,
    },
  });
  sideEffects.crmActivityWritten = crmWritten;

  const decision = await recalculateAndPersistEffectiveStatus({
    organizationId: command.organizationId,
    emailNormalized,
    categoryCode: command.categoryCode,
    campaignId: command.campaignId,
    sequenceId: command.sequenceId,
  });

  return {
    success: true,
    message: "Unsubscribe processed",
    effectiveStatus: decision.effectiveStatus,
    sideEffects,
  };
}

export async function processPreferenceUpdate(
  request: PreferenceUpdateRequest,
): Promise<{ success: boolean; message: string; effectiveStatus: string }> {
  const emailNormalized = normalizeSuppressionEmail(request.emailNormalized);
  await ensureDefaultCategories(request.organizationId);
  const preference = await ensurePreferenceRow({
    organizationId: request.organizationId,
    emailNormalized,
    source: request.source,
  });

  if (request.unsubscribeAll) {
    return processUnsubscribe({
      organizationId: request.organizationId,
      emailNormalized,
      scope: "organization",
      source: request.source,
      idempotencyKey: request.idempotencyKey,
      reasonCode: "no_reason_provided",
      ipHash: request.ipHash,
      userAgentHash: request.userAgentHash,
    });
  }

  const supabase = createServiceClient() as SupabaseLike;
  const frequencyType = (request.frequencyType ??
    preference.frequency_type ??
    "immediate") as CommunicationFrequency;
  const defaults = FREQUENCY_DEFAULTS[frequencyType];

  const update: Record<string, unknown> = {
    last_preference_update_at: nowIso(),
    source: request.source,
  };

  if (request.categoryPreferences) {
    update.category_preferences_json = {
      ...((preference.category_preferences_json as Record<string, boolean>) ?? {}),
      ...request.categoryPreferences,
    };
  }
  if (request.frequencyType) {
    update.frequency_type = frequencyType;
    update.min_days_between_emails = defaults.minDays;
    update.max_emails_per_week = defaults.maxPerWeek;
    update.max_emails_per_month = defaults.maxPerMonth;
  }
  if (request.preferredLanguage !== undefined) {
    update.preferred_language = request.preferredLanguage;
  }
  if (request.preferredTimezone !== undefined) {
    update.preferred_timezone = request.preferredTimezone;
  }
  if (request.pauseDays && request.pauseDays > 0) {
    update.pause_starts_at = nowIso();
    update.pause_ends_at = addDays(request.pauseDays);
    update.pause_scope = "organization";
    update.pause_reason = "preference_center";
  }
  if (request.pauseUntil) {
    update.pause_starts_at = nowIso();
    update.pause_ends_at = request.pauseUntil;
    update.pause_scope = "organization";
    update.pause_reason = "preference_center";
  }
  if (request.pauseDays === 0 || request.pauseUntil === null) {
    // explicit clear handled by callers setting pauseUntil null + pauseDays 0
  }

  await supabase
    .from("email_recipient_preferences")
    .update(update)
    .eq("id", preference.id);

  if (request.pauseDays && request.pauseDays > 0) {
    await cancelFutureEmailWorkForRecipient({
      organizationId: request.organizationId,
      emailNormalized,
      stopReason: "temporary_pause",
      source: request.source,
    });
  }

  await writePreferenceEvent({
    organizationId: request.organizationId,
    preferenceId: preference.id,
    emailNormalized,
    eventType: "preference_updated",
    source: request.source,
    idempotencyKey: request.idempotencyKey,
    payload: {
      frequencyType: request.frequencyType ?? null,
      pauseDays: request.pauseDays ?? null,
    },
    ipHash: request.ipHash,
    userAgentHash: request.userAgentHash,
  });

  const decision = await recalculateAndPersistEffectiveStatus({
    organizationId: request.organizationId,
    emailNormalized,
  });

  await writeCrmActivity({
    organizationId: request.organizationId,
    leadId: preference.lead_id,
    contactId: preference.contact_id,
    eventType: "email_preference_updated",
    description: "Recipient updated communication preferences",
  });

  return {
    success: true,
    message: "Preferences saved",
    effectiveStatus: decision.effectiveStatus,
  };
}

export async function issuePreferenceTokens(input: {
  organizationId: string;
  emailNormalized: string;
  queueItemId?: string | null;
  campaignId?: string | null;
  categoryCode?: string | null;
  contactId?: string | null;
  leadId?: string | null;
}) {
  const emailNormalized = normalizeSuppressionEmail(input.emailNormalized);
  await ensureDefaultCategories(input.organizationId);
  const preference = await ensurePreferenceRow({
    organizationId: input.organizationId,
    emailNormalized,
    contactId: input.contactId,
    leadId: input.leadId,
    source: "message_dispatch",
  });

  const supabase = createServiceClient() as SupabaseLike;
  const preferenceTtl = ttlDays("EMAIL_PREFERENCE_TOKEN_TTL_DAYS", 365);
  const oneClickTtl = ttlDays("EMAIL_ONE_CLICK_TOKEN_TTL_DAYS", 90);

  async function createToken(purpose: "preference_center" | "one_click_unsubscribe" | "unsubscribe_page") {
    const publicToken = createOpaquePublicToken();
    const expiresAt =
      purpose === "one_click_unsubscribe"
        ? addDays(oneClickTtl)
        : addDays(preferenceTtl);
    const { data } = await supabase
      .from("email_preference_tokens")
      .insert({
        organization_id: input.organizationId,
        preference_id: preference.id,
        email_normalized: emailNormalized,
        public_token: publicToken,
        purpose,
        token_version: 1,
        expires_at: expiresAt,
        single_use: purpose === "one_click_unsubscribe",
        related_queue_item_id: input.queueItemId ?? null,
        related_campaign_id: input.campaignId ?? null,
        related_category_code: input.categoryCode ?? null,
      })
      .select("*")
      .single();

    const signed = signPreferenceAccessToken({
      tokenId: data.id,
      purpose,
      expiresAt,
    });
    return { row: data, signed };
  }

  const preferenceCenter = await createToken("preference_center");
  const oneClick = await createToken("one_click_unsubscribe");
  const unsubscribePage = await createToken("unsubscribe_page");

  return {
    preferenceCenterUrl: buildPreferenceCenterUrl(preferenceCenter.signed),
    unsubscribePageUrl: buildUnsubscribePageUrl(unsubscribePage.signed),
    oneClickUrl: buildOneClickUnsubscribeUrl(oneClick.signed),
    preferenceTokenId: preferenceCenter.row.id as string,
    oneClickTokenId: oneClick.row.id as string,
    unsubscribeTokenId: unsubscribePage.row.id as string,
  };
}

export async function resolvePreferenceToken(signedToken: string) {
  const claims = verifyPreferenceAccessToken(signedToken);
  if (!claims) return null;

  const supabase = createServiceClient() as SupabaseLike;
  const { data: tokenRow } = await supabase
    .from("email_preference_tokens")
    .select("*")
    .eq("id", claims.tid)
    .maybeSingle();

  if (!tokenRow) return null;
  if (tokenRow.revoked_at) return null;
  if (tokenRow.expires_at && new Date(tokenRow.expires_at).getTime() < Date.now()) {
    return null;
  }
  if (tokenRow.single_use && tokenRow.used_at) return null;
  if (tokenRow.purpose !== claims.p) return null;

  const { data: preference } = await supabase
    .from("email_recipient_preferences")
    .select("*")
    .eq("organization_id", tokenRow.organization_id)
    .eq("email_normalized", tokenRow.email_normalized)
    .maybeSingle();

  const { data: organization } = await supabase
    .from("organizations")
    .select(
      "id, name, postal_address, privacy_policy_url, terms_url, support_email, logo_url, default_email_language",
    )
    .eq("id", tokenRow.organization_id)
    .maybeSingle();

  const { data: categories } = await supabase
    .from("email_communication_categories")
    .select("*")
    .eq("organization_id", tokenRow.organization_id)
    .eq("is_active", true)
    .is("archived_at", null)
    .order("display_order", { ascending: true });

  return {
    claims,
    tokenRow,
    preference,
    organization,
    categories: categories ?? [],
  };
}

export async function markTokenUsed(tokenId: string) {
  const supabase = createServiceClient() as SupabaseLike;
  await supabase
    .from("email_preference_tokens")
    .update({ used_at: nowIso() })
    .eq("id", tokenId)
    .is("used_at", null);
}

export async function requestResubscribe(input: {
  organizationId: string;
  emailNormalized: string;
  source: string;
}) {
  const emailNormalized = normalizeSuppressionEmail(input.emailNormalized);
  const supabase = createServiceClient() as SupabaseLike;
  const [{ data: suppressions }, preference] = await Promise.all([
    supabase
      .from("email_suppressions")
      .select("*")
      .eq("organization_id", input.organizationId)
      .eq("email_normalized", emailNormalized)
      .eq("active", true),
    ensurePreferenceRow({
      organizationId: input.organizationId,
      emailNormalized,
      source: input.source,
    }),
  ]);

  const gate = canResubscribe({
    suppressions: (suppressions ?? []).map((row: any) => ({
      status: row.status,
      reason: row.reason,
      active: row.active,
    })),
    preference: {
      globalUnsubscribedAt: preference.global_unsubscribed_at,
      doNotContact: preference.do_not_contact,
    },
  });

  if (!gate.allowed) {
    await supabase.from("email_resubscribe_requests").insert({
      organization_id: input.organizationId,
      preference_id: preference.id,
      email_normalized: emailNormalized,
      status: "blocked",
      blocked_reason: gate.blockedReasons.join(","),
      source: input.source,
    });
    return {
      success: false,
      message:
        "Resubscribe is not allowed while a mandatory suppression is active.",
      blockedReasons: gate.blockedReasons,
    };
  }

  const publicToken = createOpaquePublicToken();
  const expiresAt = addHours(ttlHours("EMAIL_RESUBSCRIBE_TOKEN_TTL_HOURS", 48));
  const { data: tokenRow } = await supabase
    .from("email_preference_tokens")
    .insert({
      organization_id: input.organizationId,
      preference_id: preference.id,
      email_normalized: emailNormalized,
      public_token: publicToken,
      purpose: "resubscribe_confirm",
      expires_at: expiresAt,
      single_use: true,
    })
    .select("*")
    .single();

  const signed = signPreferenceAccessToken({
    tokenId: tokenRow.id,
    purpose: "resubscribe_confirm",
    expiresAt,
  });

  await supabase.from("email_resubscribe_requests").insert({
    organization_id: input.organizationId,
    preference_id: preference.id,
    email_normalized: emailNormalized,
    token_id: tokenRow.id,
    status: "pending",
    source: input.source,
  });

  await writePreferenceEvent({
    organizationId: input.organizationId,
    preferenceId: preference.id,
    emailNormalized,
    eventType: "resubscribe_requested",
    source: input.source,
  });

  return {
    success: true,
    message: "Resubscribe confirmation required",
    confirmUrl: buildResubscribeUrl(signed),
  };
}

export async function confirmResubscribe(signedToken: string) {
  const resolved = await resolvePreferenceToken(signedToken);
  if (!resolved || resolved.tokenRow.purpose !== "resubscribe_confirm") {
    return { success: false, message: "Invalid or expired resubscribe token" };
  }

  const { tokenRow, preference } = resolved;
  const supabase = createServiceClient() as SupabaseLike;

  const { data: suppressions } = await supabase
    .from("email_suppressions")
    .select("*")
    .eq("organization_id", tokenRow.organization_id)
    .eq("email_normalized", tokenRow.email_normalized)
    .eq("active", true);

  const gate = canResubscribe({
    suppressions: (suppressions ?? []).map((row: any) => ({
      status: row.status,
      reason: row.reason,
      active: row.active,
    })),
    preference: {
      globalUnsubscribedAt: preference?.global_unsubscribed_at,
      doNotContact: preference?.do_not_contact,
    },
  });

  if (!gate.allowed) {
    return {
      success: false,
      message: "Mandatory suppression still blocks resubscribe",
      blockedReasons: gate.blockedReasons,
    };
  }

  // Deactivate only non-mandatory unsubscribed suppressions.
  for (const row of suppressions ?? []) {
    if (MANDATORY_SUPPRESSION_REASONS.has(row.reason)) continue;
    if (row.reason !== "unsubscribed" && row.status !== "unsubscribed") continue;
    await supabase
      .from("email_suppressions")
      .update({
        active: false,
        removed_at: nowIso(),
        removal_reason: "recipient_resubscribe_confirmed",
      })
      .eq("id", row.id);
    await supabase.from("email_suppression_history").insert({
      organization_id: tokenRow.organization_id,
      suppression_id: row.id,
      email_normalized: tokenRow.email_normalized,
      action: "deactivated",
      status: row.status,
      reason: row.reason,
      source: "preference_center",
      scope: row.scope,
      permanent_flag: row.permanent_flag,
      notes: "Recipient confirmed resubscribe",
    });
  }

  const categoryDefaults: Record<string, boolean> = {};
  for (const cat of DEFAULT_COMMUNICATION_CATEGORIES) {
    categoryDefaults[cat.code] = true;
  }

  await supabase
    .from("email_recipient_preferences")
    .update({
      global_unsubscribed_at: null,
      do_not_contact: false,
      category_preferences_json: categoryDefaults,
      last_resubscribe_at: nowIso(),
      last_preference_update_at: nowIso(),
      eligible_for_outreach: true,
      pause_starts_at: null,
      pause_ends_at: null,
      pause_reason: null,
    })
    .eq("organization_id", tokenRow.organization_id)
    .eq("email_normalized", tokenRow.email_normalized);

  await supabase.from("email_consent_records").insert({
    organization_id: tokenRow.organization_id,
    email_normalized: tokenRow.email_normalized,
    consent_status: "reconfirmed",
    consent_timestamp: nowIso(),
    consent_source: "preference_center_resubscribe",
    collection_method: "explicit_confirmation",
    reconfirmation_timestamp: nowIso(),
    lawful_basis_placeholder: "consent_placeholder",
  });

  await markTokenUsed(tokenRow.id);
  await supabase
    .from("email_resubscribe_requests")
    .update({ status: "confirmed", confirmed_at: nowIso() })
    .eq("token_id", tokenRow.id);

  await writePreferenceEvent({
    organizationId: tokenRow.organization_id,
    preferenceId: preference?.id ?? null,
    emailNormalized: tokenRow.email_normalized,
    eventType: "resubscribe_confirmed",
    source: "preference_center",
  });

  const decision = await recalculateAndPersistEffectiveStatus({
    organizationId: tokenRow.organization_id,
    emailNormalized: tokenRow.email_normalized,
  });

  return {
    success: true,
    message: "Resubscribe confirmed",
    effectiveStatus: decision.effectiveStatus,
  };
}

export async function createManualSuppression(input: {
  organizationId: string;
  email: string;
  reason: string;
  scope?: string;
  notes?: string | null;
  expiresAt?: string | null;
  createdBy: string;
  permanentFlag?: boolean;
}) {
  const emailNormalized = normalizeSuppressionEmail(input.email);
  await ensurePreferenceRow({
    organizationId: input.organizationId,
    emailNormalized,
    source: "admin_action",
  });
  const result = await upsertSuppressionRecord({
    organizationId: input.organizationId,
    emailNormalized,
    status: input.reason === "complaint" ? "complaint" : "manual_block",
    reason: input.reason,
    source: "admin_action",
    scope: input.scope ?? "organization",
    permanentFlag: input.permanentFlag ?? !input.expiresAt,
    expiresAt: input.expiresAt ?? null,
    notes: input.notes ?? null,
    createdBy: input.createdBy,
  });

  if (result.upserted) {
    await cancelFutureEmailWorkForRecipient({
      organizationId: input.organizationId,
      emailNormalized,
      stopReason: "manual_suppression",
      source: "admin_action",
    });
    await recalculateAndPersistEffectiveStatus({
      organizationId: input.organizationId,
      emailNormalized,
    });
  }

  return result;
}

export function buildListUnsubscribeHeaders(oneClickUrl: string): Record<string, string> {
  if (process.env.EMAIL_LIST_UNSUBSCRIBE_ENABLED === "false") {
    return {};
  }
  return {
    "List-Unsubscribe": `<${oneClickUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

export { hashPreferenceMeta, getPreferenceBaseUrl, FOOTER_VERSION };
