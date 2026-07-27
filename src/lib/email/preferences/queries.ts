/* eslint-disable @typescript-eslint/no-explicit-any */

import { createClient } from "@/lib/supabase/server";

type SupabaseLike = any;

async function getReadClient(): Promise<SupabaseLike> {
  return (await createClient()) as unknown as SupabaseLike;
}

export type PreferenceListRow = {
  id: string;
  emailNormalized: string;
  effectiveStatus: string;
  frequencyType: string;
  pauseEndsAt: string | null;
  eligibleForOutreach: boolean;
  doNotContact: boolean;
  lastPreferenceUpdateAt: string | null;
  source: string | null;
};

export type SuppressionListRow = {
  id: string;
  emailNormalized: string;
  status: string;
  reason: string;
  source: string | null;
  scope: string;
  permanentFlag: boolean;
  active: boolean;
  createdAt: string;
  expiresAt: string | null;
  campaignId: string | null;
  sequenceId: string | null;
  notes: string | null;
};

export type PreferenceStats = {
  subscribed: number;
  partiallySubscribed: number;
  paused: number;
  unsubscribed: number;
  complaintBlocked: number;
  hardBounceBlocked: number;
  suppressed: number;
  legalHold: number;
  preferenceUpdates: number;
  oneClickUnsubscribes: number;
  replyUnsubscribes: number;
};

export async function listRecipientPreferences(
  organizationId: string,
  filters?: {
    status?: string;
    eligible?: boolean;
    q?: string;
  },
): Promise<PreferenceListRow[]> {
  const supabase = await getReadClient();
  let query = supabase
    .from("email_recipient_preferences")
    .select(
      "id, email_normalized, effective_status, frequency_type, pause_ends_at, eligible_for_outreach, do_not_contact, last_preference_update_at, source",
    )
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (filters?.status) query = query.eq("effective_status", filters.status);
  if (typeof filters?.eligible === "boolean") {
    query = query.eq("eligible_for_outreach", filters.eligible);
  }
  if (filters?.q) query = query.ilike("email_normalized", `%${filters.q}%`);

  const { data } = await query;
  return ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    emailNormalized: row.email_normalized,
    effectiveStatus: row.effective_status,
    frequencyType: row.frequency_type,
    pauseEndsAt: row.pause_ends_at,
    eligibleForOutreach: row.eligible_for_outreach,
    doNotContact: row.do_not_contact,
    lastPreferenceUpdateAt: row.last_preference_update_at,
    source: row.source,
  }));
}

export async function listSuppressions(
  organizationId: string,
  filters?: {
    reason?: string;
    active?: boolean;
    q?: string;
  },
): Promise<SuppressionListRow[]> {
  const supabase = await getReadClient();
  let query = supabase
    .from("email_suppressions")
    .select(
      "id, email_normalized, status, reason, source, scope, permanent_flag, active, created_at, expires_at, campaign_id, sequence_id, notes",
    )
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (filters?.reason) query = query.eq("reason", filters.reason);
  if (typeof filters?.active === "boolean") query = query.eq("active", filters.active);
  if (filters?.q) query = query.ilike("email_normalized", `%${filters.q}%`);

  const { data } = await query;
  return ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    emailNormalized: row.email_normalized,
    status: row.status,
    reason: row.reason,
    source: row.source,
    scope: row.scope ?? "organization",
    permanentFlag: row.permanent_flag ?? true,
    active: row.active ?? true,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    campaignId: row.campaign_id,
    sequenceId: row.sequence_id,
    notes: row.notes,
  }));
}

export async function getPreferenceStats(
  organizationId: string,
): Promise<PreferenceStats> {
  const supabase = await getReadClient();
  const [{ data: prefs }, { data: events }] = await Promise.all([
    supabase
      .from("email_recipient_preferences")
      .select("effective_status")
      .eq("organization_id", organizationId),
    supabase
      .from("email_preference_events")
      .select("event_type")
      .eq("organization_id", organizationId),
  ]);

  const stats: PreferenceStats = {
    subscribed: 0,
    partiallySubscribed: 0,
    paused: 0,
    unsubscribed: 0,
    complaintBlocked: 0,
    hardBounceBlocked: 0,
    suppressed: 0,
    legalHold: 0,
    preferenceUpdates: 0,
    oneClickUnsubscribes: 0,
    replyUnsubscribes: 0,
  };

  for (const row of prefs ?? []) {
    switch (row.effective_status) {
      case "subscribed":
        stats.subscribed += 1;
        break;
      case "partially_subscribed":
        stats.partiallySubscribed += 1;
        break;
      case "paused":
        stats.paused += 1;
        break;
      case "unsubscribed":
        stats.unsubscribed += 1;
        break;
      case "complaint_blocked":
        stats.complaintBlocked += 1;
        break;
      case "hard_bounce_blocked":
        stats.hardBounceBlocked += 1;
        break;
      case "legal_hold":
        stats.legalHold += 1;
        break;
      default:
        stats.suppressed += 1;
    }
  }

  for (const row of events ?? []) {
    if (row.event_type === "preference_updated") stats.preferenceUpdates += 1;
    if (row.event_type === "one_click_unsubscribe") stats.oneClickUnsubscribes += 1;
    if (row.event_type === "reply_unsubscribe") stats.replyUnsubscribes += 1;
  }

  return stats;
}
