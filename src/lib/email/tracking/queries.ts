/* eslint-disable @typescript-eslint/no-explicit-any */

import { createServiceClient } from "@/lib/supabase/admin";

type SupabaseLike = any;

export type EngagementOverview = {
  openedMessages: number;
  uniqueOpens: number;
  clickedMessages: number;
  uniqueClicks: number;
  repliedMessages: number;
};

export type TrackingEventRow = {
  id: string;
  eventType: string;
  occurredAt: string;
  targetUrl: string | null;
};

export async function getEngagementOverview(
  organizationId: string,
): Promise<EngagementOverview> {
  const supabase = createServiceClient() as SupabaseLike;
  const { data } = await supabase
    .from("email_message_engagement_status")
    .select("total_open_count, unique_open_count, total_click_count, unique_click_count, reply_count")
    .eq("organization_id", organizationId);

  const summary: EngagementOverview = {
    openedMessages: 0,
    uniqueOpens: 0,
    clickedMessages: 0,
    uniqueClicks: 0,
    repliedMessages: 0,
  };

  for (const row of data ?? []) {
    if ((row.total_open_count ?? 0) > 0) summary.openedMessages += 1;
    summary.uniqueOpens += row.unique_open_count ?? 0;
    if ((row.total_click_count ?? 0) > 0) summary.clickedMessages += 1;
    summary.uniqueClicks += row.unique_click_count ?? 0;
    if ((row.reply_count ?? 0) > 0) summary.repliedMessages += 1;
  }

  return summary;
}

export async function listRecentTrackingEvents(
  organizationId: string,
  limit = 20,
): Promise<TrackingEventRow[]> {
  const supabase = createServiceClient() as SupabaseLike;
  const { data } = await supabase
    .from("email_tracking_events")
    .select("id, event_type, occurred_at, target_url")
    .eq("organization_id", organizationId)
    .order("occurred_at", { ascending: false })
    .limit(limit);

  return ((data ?? []) as Array<Record<string, string | null>>).map((row) => ({
    id: row.id ?? "",
    eventType: row.event_type ?? "",
    occurredAt: row.occurred_at ?? "",
    targetUrl: row.target_url ?? null,
  }));
}

