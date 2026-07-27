/**
 * Marketing agent history logging.
 */

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

export async function logMarketingEvent(params: {
  organizationId: string;
  eventType: string;
  summary: string;
  actorUserId?: string | null;
  campaignId?: string | null;
  payload?: Record<string, unknown>;
  provider?: string | null;
  model?: string | null;
  costUsd?: number;
}): Promise<void> {
  const supabase = await createClient();
  await supabase.from("marketing_agent_history_events").insert({
    organization_id: params.organizationId,
    event_type: params.eventType,
    summary: params.summary,
    actor_user_id: params.actorUserId ?? null,
    campaign_id: params.campaignId ?? null,
    payload_json: (params.payload ?? {}) as Json,
    provider: params.provider ?? null,
    model: params.model ?? null,
    cost_usd: params.costUsd ?? 0,
  });
}
