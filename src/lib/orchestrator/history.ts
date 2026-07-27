/**
 * Orchestrator audit history.
 */

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

export async function recordOrchestratorEvent(params: {
  organizationId: string;
  eventType: string;
  summary: string;
  executionId?: string | null;
  goalId?: string | null;
  actorUserId?: string | null;
  payload?: Record<string, unknown>;
  provider?: string | null;
  model?: string | null;
  costUsd?: number;
}) {
  const supabase = await createClient();
  await supabase.from("orchestrator_history_events").insert({
    organization_id: params.organizationId,
    event_type: params.eventType,
    summary: params.summary,
    execution_id: params.executionId ?? null,
    goal_id: params.goalId ?? null,
    actor_user_id: params.actorUserId ?? null,
    payload_json: (params.payload ?? {}) as Json,
    provider: params.provider ?? null,
    model: params.model ?? null,
    cost_usd: params.costUsd ?? 0,
  });
}
