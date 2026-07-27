/**
 * Match outbox events → enqueue automation runs (deduped).
 */

import { parseAutomationGraph } from "@/lib/crm/automation/graph";
import { executeAutomationRun } from "@/lib/crm/automation/executor";
import type { Json } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;

/** Map outbox event_type aliases to automation trigger_type. */
export function normalizeTriggerType(eventType: string): string[] {
  const aliases: Record<string, string[]> = {
    stage_changed: ["stage_changed", "pipeline_stage_changed"],
    pipeline_stage_changed: ["pipeline_stage_changed", "stage_changed"],
    lead_score_recalculated: ["lead_score_changed", "lead_score_recalculated"],
    lead_became_hot: ["lead_became_hot", "lead_score_changed"],
    lead_score_increased: ["lead_score_increased", "lead_score_changed"],
    lead_score_decreased: ["lead_score_decreased", "lead_score_changed"],
  };
  return aliases[eventType] ?? [eventType];
}

export async function processPendingAutomationEvents(
  supabase: Client,
  organizationId: string,
  limit = 20,
): Promise<{ processed: number; runs: number }> {
  const { data: events, error } = await supabase
    .from("crm_automation_events")
    .select("*")
    .eq("organization_id", organizationId)
    .is("processed_at", null)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);

  let processed = 0;
  let runs = 0;

  for (const event of events ?? []) {
    const triggerTypes = normalizeTriggerType(event.event_type);
    const { data: automations } = await supabase
      .from("crm_automations")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .eq("enabled", true)
      .in("trigger_type", triggerTypes);

    for (const automation of automations ?? []) {
      const idempotencyKey = `${automation.id}:${event.id}`;
      const { data: existing } = await supabase
        .from("crm_automation_runs")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      if (existing) continue;

      const { data: run, error: runErr } = await supabase
        .from("crm_automation_runs")
        .insert({
          organization_id: organizationId,
          automation_id: automation.id,
          source_event_id: event.id,
          entity_type: event.entity_type,
          entity_id: event.entity_id,
          status: "pending",
          trigger_type: event.event_type,
          context_json: {
            ...(typeof event.payload_json === "object" &&
            event.payload_json &&
            !Array.isArray(event.payload_json)
              ? event.payload_json
              : {}),
            trigger_type: event.event_type,
            entity_type: event.entity_type,
            entity_id: event.entity_id,
          } as Json,
          idempotency_key: idempotencyKey,
        })
        .select("id")
        .single();

      if (runErr || !run) continue;
      runs += 1;

      const graph = parseAutomationGraph(automation.workflow_graph_json);
      await executeAutomationRun(supabase, {
        organizationId,
        runId: run.id,
        graph,
        context: {
          trigger_type: event.event_type,
          entity_type: event.entity_type,
          entity_id: event.entity_id,
          payload: event.payload_json,
          ...(typeof event.payload_json === "object" &&
          event.payload_json &&
          !Array.isArray(event.payload_json)
            ? (event.payload_json as Record<string, unknown>)
            : {}),
        },
      });
    }

    await supabase
      .from("crm_automation_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("id", event.id)
      .eq("organization_id", organizationId);
    processed += 1;
  }

  return { processed, runs };
}
