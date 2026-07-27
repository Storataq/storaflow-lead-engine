/**
 * Background task worker for queued AI tasks.
 */

import { claimNextTasks, completeTask, failTask } from "@/ai/tasks/queue";
import { invokeTool } from "@/ai/tools/calling";
import { emitAiEvent } from "@/ai/events/bus";

export type AiWorkerResult = {
  claimed: number;
  completed: number;
  failed: number;
  dead: number;
};

export async function runAiTaskWorker(params: {
  organizationId: string;
  batchSize?: number;
  grantedPermissions?: string[];
}): Promise<AiWorkerResult> {
  const claimed = await claimNextTasks({
    organizationId: params.organizationId,
    limit: params.batchSize ?? 10,
  });

  let completed = 0;
  let failed = 0;
  let dead = 0;

  const permissions = params.grantedPermissions ?? [
    "companies:read",
    "contacts:read",
    "deals:read",
    "tasks:read",
    "memory:read",
    "memory:write",
    "knowledge:read",
    "analytics:read",
  ];

  for (const task of claimed) {
    if (!task.tool_name) {
      await completeTask(task.id, params.organizationId, { skipped: true });
      completed += 1;
      continue;
    }

    const input =
      task.input_json &&
      typeof task.input_json === "object" &&
      !Array.isArray(task.input_json)
        ? (task.input_json as Record<string, unknown>)
        : {};

    const result = await invokeTool({
      organizationId: params.organizationId,
      userId: null,
      agentId: null,
      runId: task.run_id,
      toolKey: task.tool_name,
      input,
      grantedPermissions: permissions,
    });

    if (result.ok) {
      await completeTask(task.id, params.organizationId, result.output);
      await emitAiEvent({
        organizationId: params.organizationId,
        eventType: "task.completed",
        runId: task.run_id,
        taskId: task.id,
        payload: { tool: task.tool_name },
      });
      completed += 1;
    } else {
      const outcome = await failTask({
        taskId: task.id,
        organizationId: params.organizationId,
        errorMessage: result.error ?? "failed",
        maxAttempts: task.max_attempts,
        attempt: task.attempt,
      });
      await emitAiEvent({
        organizationId: params.organizationId,
        eventType: "task.failed",
        runId: task.run_id,
        taskId: task.id,
        payload: { error: result.error, outcome },
      });
      if (outcome === "dead") dead += 1;
      else failed += 1;
    }
  }

  return {
    claimed: claimed.length,
    completed,
    failed,
    dead,
  };
}
