import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/types/supabase";

type Client = SupabaseClient<Database>;

export type LogCrmActivityInput = {
  organizationId: string;
  userId?: string | null;
  eventType: string;
  entityType: string;
  entityId: string;
  description: string;
  metadata?: Record<string, unknown>;
};

export async function logCrmActivity(
  supabase: Client,
  input: LogCrmActivityInput,
): Promise<void> {
  await supabase.from("activity_events").insert({
    organization_id: input.organizationId,
    user_id: input.userId ?? null,
    event_type: input.eventType,
    entity_type: input.entityType,
    entity_id: input.entityId,
    description: input.description,
    metadata_json: (input.metadata ?? {}) as Json,
  });
}
