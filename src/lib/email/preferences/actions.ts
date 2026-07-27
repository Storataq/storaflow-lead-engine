"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  confirmResubscribe,
  hashPreferenceMeta,
  markTokenUsed,
  processPreferenceUpdate,
  processUnsubscribe,
  requestResubscribe,
  resolvePreferenceToken,
  type CommunicationFrequency,
  type UnsubscribeReasonCode,
} from "@/lib/email/preferences";

export type PublicPreferenceActionResult = {
  success: boolean;
  message: string;
  effectiveStatus?: string;
  confirmUrl?: string;
};

export async function savePublicPreferencesAction(input: {
  token: string;
  categoryPreferences: Record<string, boolean>;
  frequencyType: CommunicationFrequency;
  preferredLanguage: string | null;
  preferredTimezone: string | null;
  pauseDays: number | null;
  unsubscribeAll: boolean;
}): Promise<PublicPreferenceActionResult> {
  const resolved = await resolvePreferenceToken(input.token);
  if (!resolved) {
    return { success: false, message: "Invalid or expired link" };
  }

  const result = await processPreferenceUpdate({
    organizationId: resolved.tokenRow.organization_id,
    emailNormalized: resolved.tokenRow.email_normalized,
    categoryPreferences: input.categoryPreferences,
    frequencyType: input.frequencyType,
    preferredLanguage: input.preferredLanguage,
    preferredTimezone: input.preferredTimezone,
    pauseDays: input.pauseDays,
    unsubscribeAll: input.unsubscribeAll,
    source: "preference_center",
    idempotencyKey: `prefsave:${resolved.tokenRow.id}:${Date.now()}`,
  });

  return {
    success: result.success,
    message: result.message,
    effectiveStatus: result.effectiveStatus,
  };
}

export async function publicUnsubscribeAction(input: {
  token: string;
  scope: "organization" | "category" | "temporary_pause";
  categoryCode?: string | null;
  reasonCode?: UnsubscribeReasonCode | null;
}): Promise<PublicPreferenceActionResult> {
  const resolved = await resolvePreferenceToken(input.token);
  if (!resolved) {
    return { success: false, message: "Invalid or expired link" };
  }

  const result = await processUnsubscribe({
    organizationId: resolved.tokenRow.organization_id,
    emailNormalized: resolved.tokenRow.email_normalized,
    scope: input.scope,
    categoryCode: input.categoryCode ?? resolved.tokenRow.related_category_code,
    campaignId: resolved.tokenRow.related_campaign_id,
    source:
      resolved.tokenRow.purpose === "one_click_unsubscribe"
        ? "one_click_unsubscribe"
        : "email_footer",
    reasonCode: input.reasonCode ?? "no_reason_provided",
    relatedQueueItemId: resolved.tokenRow.related_queue_item_id,
    idempotencyKey: `unsub:${resolved.tokenRow.id}:${input.scope}:${input.categoryCode ?? "all"}`,
    leadId: resolved.preference?.lead_id ?? null,
    contactId: resolved.preference?.contact_id ?? null,
  });

  if (resolved.tokenRow.single_use) {
    await markTokenUsed(resolved.tokenRow.id);
  }

  return {
    success: result.success,
    message: result.message,
    effectiveStatus: result.effectiveStatus,
  };
}

export async function publicResubscribeRequestAction(input: {
  token: string;
}): Promise<PublicPreferenceActionResult> {
  const resolved = await resolvePreferenceToken(input.token);
  if (!resolved) {
    return { success: false, message: "Invalid or expired link" };
  }

  const result = await requestResubscribe({
    organizationId: resolved.tokenRow.organization_id,
    emailNormalized: resolved.tokenRow.email_normalized,
    source: "preference_center",
  });

  return {
    success: result.success,
    message: result.message,
    confirmUrl: "confirmUrl" in result ? result.confirmUrl : undefined,
  };
}

export async function publicResubscribeConfirmAction(input: {
  token: string;
}): Promise<PublicPreferenceActionResult> {
  const result = await confirmResubscribe(input.token);
  return {
    success: result.success,
    message: result.message,
    effectiveStatus:
      "effectiveStatus" in result ? result.effectiveStatus : undefined,
  };
}

export async function recordPreferenceCenterOpenAction(token: string) {
  const resolved = await resolvePreferenceToken(token);
  if (!resolved) return;
  const { createServiceClient } = await import("@/lib/supabase/admin");
  const supabase = createServiceClient() as any;
  await supabase.from("email_preference_events").insert({
    organization_id: resolved.tokenRow.organization_id,
    preference_id: resolved.preference?.id ?? null,
    email_normalized: resolved.tokenRow.email_normalized,
    event_type: "preference_center_opened",
    source: "preference_center",
    idempotency_key: `opened:${resolved.tokenRow.id}:${new Date().toISOString().slice(0, 10)}`,
    payload_json: {},
    ip_hash: null,
    user_agent_hash: hashPreferenceMeta(null),
  });
}
