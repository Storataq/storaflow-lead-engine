/* eslint-disable @typescript-eslint/no-explicit-any */

import { createServiceClient } from "@/lib/supabase/admin";

type SupabaseLike = any;

export type DeliveryOverview = {
  prepared: number;
  sent: number;
  delivered: number;
  delayed: number;
  softBounced: number;
  hardBounced: number;
  complained: number;
  rejected: number;
  failed: number;
};

export type ProviderEventRow = {
  id: string;
  provider: string;
  eventType: string;
  normalizedEventType: string;
  providerMessageId: string | null;
  processingStatus: string;
  correlationStatus: string;
  receivedAt: string;
};

export async function getDeliveryOverview(
  organizationId: string,
): Promise<DeliveryOverview> {
  const supabase = createServiceClient() as SupabaseLike;
  const { data } = await supabase
    .from("email_message_delivery_status")
    .select("current_status")
    .eq("organization_id", organizationId);

  const summary: DeliveryOverview = {
    prepared: 0,
    sent: 0,
    delivered: 0,
    delayed: 0,
    softBounced: 0,
    hardBounced: 0,
    complained: 0,
    rejected: 0,
    failed: 0,
  };

  for (const row of (data ?? []) as Array<{ current_status: string }>) {
    const status = row.current_status;
    if (status === "prepared" || status === "accepted" || status === "queued") {
      summary.prepared += 1;
    } else if (status === "sent") {
      summary.sent += 1;
    } else if (status === "delivered") {
      summary.delivered += 1;
    } else if (status === "delayed") {
      summary.delayed += 1;
    } else if (status === "soft_bounced") {
      summary.softBounced += 1;
    } else if (status === "hard_bounced") {
      summary.hardBounced += 1;
    } else if (status === "complained") {
      summary.complained += 1;
    } else if (status === "rejected") {
      summary.rejected += 1;
    } else if (status === "failed" || status === "cancelled" || status === "unknown") {
      summary.failed += 1;
    }
  }

  return summary;
}

export async function listRecentProviderEvents(
  organizationId: string,
  limit = 20,
): Promise<ProviderEventRow[]> {
  const supabase = createServiceClient() as SupabaseLike;
  const { data } = await supabase
    .from("email_provider_events")
    .select(
      "id, provider, event_type, normalized_event_type, provider_message_id, processing_status, correlation_status, received_at",
    )
    .eq("organization_id", organizationId)
    .order("received_at", { ascending: false })
    .limit(limit);

  return ((data ?? []) as Array<Record<string, string | null>>).map((row) => ({
    id: row.id ?? "",
    provider: row.provider ?? "",
    eventType: row.event_type ?? "",
    normalizedEventType: row.normalized_event_type ?? "",
    providerMessageId: row.provider_message_id,
    processingStatus: row.processing_status ?? "",
    correlationStatus: row.correlation_status ?? "",
    receivedAt: row.received_at ?? "",
  }));
}

