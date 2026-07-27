/**
 * Task engine — queues, scheduling, retries, DLQ, cancellation.
 */

import type { AiTaskQueueName, AiTaskStatus } from "@/ai/constants";
import type { AiTaskRow, PlanSubtask } from "@/ai/types";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

export async function enqueuePlanTasks(params: {
  organizationId: string;
  runId: string;
  subtasks: PlanSubtask[];
}): Promise<AiTaskRow[]> {
  const supabase = await createClient();
  const rows = params.subtasks.map((s) => ({
    organization_id: params.organizationId,
    run_id: params.runId,
    queue_name: (s.priority < 80 ? "priority" : "default") as AiTaskQueueName,
    title: s.title,
    status: "queued" as AiTaskStatus,
    priority: s.priority,
    depends_on_json: s.dependsOn as Json,
    input_json: (s.input ?? {}) as Json,
    tool_name: s.toolName ?? null,
    attempt: 0,
    max_attempts: 3,
  }));

  const { data, error } = await supabase
    .from("ai_tasks")
    .insert(rows)
    .select("*");
  if (error) return [];
  return (data ?? []) as AiTaskRow[];
}

export async function claimNextTasks(params: {
  organizationId: string;
  limit?: number;
}): Promise<AiTaskRow[]> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const { data } = await supabase
    .from("ai_tasks")
    .select("*")
    .eq("organization_id", params.organizationId)
    .in("status", ["queued", "scheduled", "retrying"])
    .or(`scheduled_at.is.null,scheduled_at.lte.${nowIso}`)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(params.limit ?? 10);

  const candidates = (data ?? []) as AiTaskRow[];
  const claimed: AiTaskRow[] = [];

  for (const task of candidates) {
    if (task.queue_name === "dead_letter") continue;
    const deps = Array.isArray(task.depends_on_json)
      ? (task.depends_on_json as string[])
      : [];
    if (deps.length > 0) {
      // Dependency ids in plan are logical; after insert we track by title order — skip unfinished siblings in same run
      const { data: siblings } = await supabase
        .from("ai_tasks")
        .select("id, status, title")
        .eq("run_id", task.run_id);
      const unfinished = (siblings ?? []).filter(
        (s) =>
          s.id !== task.id &&
          !["completed", "cancelled"].includes(String(s.status)),
      );
      // Only block when earlier priority tasks unfinished
      const blockers = unfinished.filter((s) => {
        const sib = candidates.find((c) => c.id === s.id) ?? s;
        return Number((sib as { priority?: number }).priority ?? 999) <
          task.priority;
      });
      if (blockers.length > 0) continue;
    }

    const { data: updated } = await supabase
      .from("ai_tasks")
      .update({
        status: "running",
        started_at: nowIso,
        attempt: task.attempt + 1,
      })
      .eq("id", task.id)
      .in("status", ["queued", "scheduled", "retrying"])
      .select("*")
      .maybeSingle();

    if (updated) claimed.push(updated as AiTaskRow);
  }

  return claimed;
}

export async function completeTask(
  taskId: string,
  organizationId: string,
  output: Record<string, unknown>,
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("ai_tasks")
    .update({
      status: "completed",
      output_json: output as Json,
      completed_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", taskId)
    .eq("organization_id", organizationId);
}

export async function failTask(params: {
  taskId: string;
  organizationId: string;
  errorMessage: string;
  maxAttempts: number;
  attempt: number;
}): Promise<"retry" | "dead"> {
  const supabase = await createClient();
  if (params.attempt >= params.maxAttempts) {
    await supabase
      .from("ai_tasks")
      .update({
        status: "dead",
        queue_name: "dead_letter",
        error_message: params.errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq("id", params.taskId)
      .eq("organization_id", params.organizationId);
    return "dead";
  }

  await supabase
    .from("ai_tasks")
    .update({
      status: "retrying",
      queue_name: "retry",
      error_message: params.errorMessage,
      scheduled_at: new Date(Date.now() + params.attempt * 1000).toISOString(),
    })
    .eq("id", params.taskId)
    .eq("organization_id", params.organizationId);
  return "retry";
}

export async function cancelRunTasks(
  organizationId: string,
  runId: string,
): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_tasks")
    .update({ status: "cancelled", completed_at: new Date().toISOString() })
    .eq("organization_id", organizationId)
    .eq("run_id", runId)
    .in("status", ["queued", "scheduled", "retrying", "waiting", "running"])
    .select("id");
  return data?.length ?? 0;
}
