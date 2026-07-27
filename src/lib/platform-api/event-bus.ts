/**
 * Internal event bus + outbox — modules publish; webhooks subscribe.
 */

import { randomUUID } from "crypto";

import type { PlatformWebhookEvent } from "@/lib/platform-api/constants";
import { createServiceClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/supabase";

export type PlatformEvent = {
  organizationId: string;
  eventType: PlatformWebhookEvent | string;
  eventId?: string;
  payload: Record<string, unknown>;
};

type Listener = (event: PlatformEvent) => void | Promise<void>;

const listeners = new Set<Listener>();

export function subscribePlatformEvents(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Persist to outbox and notify in-process listeners (webhook dispatcher).
 */
export async function publishPlatformEvent(
  event: PlatformEvent,
): Promise<{ eventId: string }> {
  const eventId = event.eventId ?? randomUUID();
  try {
    const supabase = createServiceClient();
    await supabase.from("platform_event_outbox").upsert(
      {
        organization_id: event.organizationId,
        event_type: event.eventType,
        event_id: eventId,
        payload_json: event.payload as Json,
        status: "pending",
      },
      { onConflict: "organization_id,event_id" },
    );
  } catch {
    // Migration may be pending — still fan-out in-memory
  }

  const enriched = { ...event, eventId };
  for (const listener of listeners) {
    try {
      await listener(enriched);
    } catch {
      /* isolate listener failures */
    }
  }

  try {
    const supabase = createServiceClient();
    await supabase
      .from("platform_event_outbox")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
      })
      .eq("organization_id", event.organizationId)
      .eq("event_id", eventId);
  } catch {
    /* ignore */
  }

  return { eventId };
}
