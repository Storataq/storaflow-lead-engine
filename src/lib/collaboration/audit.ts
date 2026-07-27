/**
 * Collaboration audit + activity_events bridge.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { logCrmActivity } from "@/lib/crm/activity";
import type { Database, Json } from "@/types/supabase";

type Client = SupabaseClient<Database>;

export async function logCollabAudit(
  supabase: Client,
  input: {
    organizationId: string;
    actorUserId?: string | null;
    action: string;
    entityType?: string | null;
    entityId?: string | null;
    description: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await supabase.from("collaboration_audit_events").insert({
    organization_id: input.organizationId,
    actor_user_id: input.actorUserId ?? null,
    action: input.action,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    description: input.description,
    metadata_json: (input.metadata ?? {}) as Json,
  });

  // Mirror into unified activity feed when entity present
  if (input.entityType && input.entityId) {
    await logCrmActivity(supabase, {
      organizationId: input.organizationId,
      userId: input.actorUserId,
      eventType: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      description: input.description,
      metadata: input.metadata,
    });
  }
}
