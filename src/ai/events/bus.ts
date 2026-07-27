/**
 * Central AI event bus (persisted).
 */

import type { AiEventType } from "@/ai/constants";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

export async function emitAiEvent(params: {
  organizationId: string;
  eventType: AiEventType | string;
  agentId?: string | null;
  runId?: string | null;
  taskId?: string | null;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const supabase = await createClient();
  await supabase.from("ai_events").insert({
    organization_id: params.organizationId,
    event_type: params.eventType,
    agent_id: params.agentId ?? null,
    run_id: params.runId ?? null,
    task_id: params.taskId ?? null,
    payload_json: (params.payload ?? {}) as Json,
  });
}
