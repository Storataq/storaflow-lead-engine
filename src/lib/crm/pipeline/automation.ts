/**
 * Emit CRM automation outbox events for future workers.
 */

import type { PipelineAutomationEvent } from "@/lib/crm/pipeline/constants";
import type { Json } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;

export async function emitPipelineAutomationEvent(
  supabase: Client,
  input: {
    organizationId: string;
    eventType: PipelineAutomationEvent | string;
    entityType: string;
    entityId: string;
    payload?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await supabase.from("crm_automation_events").insert({
      organization_id: input.organizationId,
      event_type: input.eventType,
      entity_type: input.entityType,
      entity_id: input.entityId,
      payload_json: (input.payload ?? {}) as Json,
    });
  } catch {
    // Extension point must never break primary CRM flows
  }
}
