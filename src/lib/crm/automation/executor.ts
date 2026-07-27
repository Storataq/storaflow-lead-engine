/**
 * Queue-ready automation executor (simulated side-effects in Phase 25F).
 * Real workers can replace simulateAction with CRM/email calls later.
 */

import { evaluateCondition } from "@/lib/crm/automation/conditions";
import type {
  AutomationWorkflowGraph,
  ExecutedAction,
} from "@/lib/crm/automation/types";
import type { AutomationContext } from "@/lib/crm/automation/conditions";
import type { Json } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;

function asJson(value: unknown): Json {
  return value as Json;
}

async function appendLog(
  supabase: Client,
  input: {
    organizationId: string;
    runId: string;
    stepKey?: string;
    stepType?: string;
    level?: "debug" | "info" | "warn" | "error";
    message: string;
    result?: string;
    executionTimeMs?: number;
    payload?: Record<string, unknown>;
    errorMessage?: string;
  },
) {
  await supabase.from("crm_automation_run_logs").insert({
    organization_id: input.organizationId,
    run_id: input.runId,
    step_key: input.stepKey ?? null,
    step_type: input.stepType ?? null,
    level: input.level ?? "info",
    message: input.message,
    result: input.result ?? null,
    execution_time_ms: input.executionTimeMs ?? null,
    payload_json: asJson(input.payload ?? {}),
    error_message: input.errorMessage ?? null,
  });
}

function simulateAction(action: string, ctx: AutomationContext): ExecutedAction {
  // Future: Slack / Teams / webhook / SMS / WhatsApp / LinkedIn / push / voice
  const futureReady = [
    "slack_ready",
    "teams_ready",
    "webhook_ready",
    "export_ready",
  ];
  if (futureReady.includes(action)) {
    return {
      action,
      status: "queued",
      detail: "Channel extension point — not executed yet.",
    };
  }
  return {
    action,
    status: "simulated",
    detail: `Simulated ${action} for ${String(ctx.entity_type ?? "entity")} ${String(ctx.entity_id ?? "")}`.trim(),
  };
}

export async function executeAutomationRun(
  supabase: Client,
  input: {
    organizationId: string;
    runId: string;
    graph: AutomationWorkflowGraph;
    context: AutomationContext;
  },
): Promise<{
  status: "completed" | "failed";
  executed: ExecutedAction[];
  errorMessage?: string;
}> {
  const started = Date.now();
  const executed: ExecutedAction[] = [];

  await supabase
    .from("crm_automation_runs")
    .update({
      status: "running",
      started_at: new Date().toISOString(),
    })
    .eq("id", input.runId)
    .eq("organization_id", input.organizationId);

  await appendLog(supabase, {
    organizationId: input.organizationId,
    runId: input.runId,
    stepType: "trigger",
    message: `Run started — trigger ${String(input.context.trigger_type ?? "manual")}`,
    payload: input.context,
  });

  try {
    const nodeMap = new Map(input.graph.nodes.map((n) => [n.id, n]));
    const outgoing = new Map<string, typeof input.graph.edges>();
    for (const edge of input.graph.edges) {
      const list = outgoing.get(edge.source) ?? [];
      list.push(edge);
      outgoing.set(edge.source, list);
    }

    let current = input.graph.nodes.find((n) => n.type === "start")?.id;
    const visited = new Set<string>();
    let steps = 0;

    while (current && steps < 50) {
      steps += 1;
      if (visited.has(current)) break;
      visited.add(current);
      const node = nodeMap.get(current);
      if (!node) break;

      const stepStart = Date.now();

      if (node.type === "end" || node.type === "exit") {
        await appendLog(supabase, {
          organizationId: input.organizationId,
          runId: input.runId,
          stepKey: node.id,
          stepType: node.type,
          message: `Reached ${node.label}`,
          result: "ok",
          executionTimeMs: Date.now() - stepStart,
        });
        break;
      }

      if (node.type === "delay") {
        const amount = Number(node.config?.amount ?? 0);
        const unit = String(node.config?.unit ?? "days");
        await appendLog(supabase, {
          organizationId: input.organizationId,
          runId: input.runId,
          stepKey: node.id,
          stepType: "delay",
          message: `Delay queued: ${amount} ${unit}`,
          result: "queued",
          executionTimeMs: Date.now() - stepStart,
          payload: { amount, unit },
        });
        executed.push({
          action: "delay",
          status: "queued",
          detail: `${amount} ${unit}`,
        });
      }

      if (node.type === "condition" || node.type === "decision") {
        const rule = {
          field: String(node.config?.field ?? "lead_score"),
          operator: String(node.config?.operator ?? "gte"),
          value: (node.config?.value as string | number | boolean | null) ?? null,
        };
        const pass = evaluateCondition(input.context, rule);
        await appendLog(supabase, {
          organizationId: input.organizationId,
          runId: input.runId,
          stepKey: node.id,
          stepType: node.type,
          message: `Condition ${rule.field} ${rule.operator} ${String(rule.value)} → ${pass ? "Yes" : "No"}`,
          result: pass ? "yes" : "no",
          executionTimeMs: Date.now() - stepStart,
          payload: { rule, pass },
        });
        const edges = outgoing.get(current) ?? [];
        const preferred =
          edges.find((e) =>
            pass
              ? (e.label ?? "").toLowerCase() === "yes"
              : (e.label ?? "").toLowerCase() === "no",
          ) ?? edges[0];
        current = preferred?.target;
        continue;
      }

      if (node.type === "action") {
        const action = String(node.config?.action ?? node.label);
        const result = simulateAction(action, input.context);
        executed.push(result);
        await appendLog(supabase, {
          organizationId: input.organizationId,
          runId: input.runId,
          stepKey: node.id,
          stepType: "action",
          message: `Action ${action}`,
          result: result.status,
          executionTimeMs: Date.now() - stepStart,
          payload: { result },
        });
      }

      if (node.type === "trigger" || node.type === "start" || node.type === "split" || node.type === "merge" || node.type === "loop") {
        await appendLog(supabase, {
          organizationId: input.organizationId,
          runId: input.runId,
          stepKey: node.id,
          stepType: node.type,
          message: `Step ${node.label}`,
          result: "ok",
          executionTimeMs: Date.now() - stepStart,
        });
      }

      const next = (outgoing.get(current) ?? [])[0];
      current = next?.target;
    }

    const duration = Date.now() - started;
    await supabase
      .from("crm_automation_runs")
      .update({
        status: "completed",
        finished_at: new Date().toISOString(),
        duration_ms: duration,
        executed_actions_json: asJson(executed),
      })
      .eq("id", input.runId)
      .eq("organization_id", input.organizationId);

    await appendLog(supabase, {
      organizationId: input.organizationId,
      runId: input.runId,
      message: `Run completed in ${duration}ms`,
      result: "completed",
      executionTimeMs: duration,
    });

    return { status: "completed", executed };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Execution failed";
    await supabase
      .from("crm_automation_runs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - started,
        error_message: message,
        executed_actions_json: asJson(executed),
      })
      .eq("id", input.runId)
      .eq("organization_id", input.organizationId);

    await appendLog(supabase, {
      organizationId: input.organizationId,
      runId: input.runId,
      level: "error",
      message: "Run failed",
      errorMessage: message,
      result: "failed",
    });

    return { status: "failed", executed, errorMessage: message };
  }
}
