/**
 * Execution history logging.
 */

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

export async function writeExecutionLog(params: {
  organizationId: string;
  runId?: string | null;
  taskId?: string | null;
  agentId?: string | null;
  userId?: string | null;
  provider?: string | null;
  model?: string | null;
  toolName?: string | null;
  inputPreview?: string;
  outputPreview?: string;
  tokensIn?: number;
  tokensOut?: number;
  costUsd?: number;
  latencyMs?: number;
  approvalStatus?: string | null;
  errorMessage?: string | null;
  securityFlags?: string[];
}): Promise<void> {
  const supabase = await createClient();
  await supabase.from("ai_execution_logs").insert({
    organization_id: params.organizationId,
    run_id: params.runId ?? null,
    task_id: params.taskId ?? null,
    agent_id: params.agentId ?? null,
    user_id: params.userId ?? null,
    provider: params.provider ?? null,
    model: params.model ?? null,
    tool_name: params.toolName ?? null,
    input_preview: (params.inputPreview ?? "").slice(0, 2000),
    output_preview: (params.outputPreview ?? "").slice(0, 4000),
    tokens_in: params.tokensIn ?? 0,
    tokens_out: params.tokensOut ?? 0,
    cost_usd: params.costUsd ?? 0,
    latency_ms: params.latencyMs ?? 0,
    approval_status: params.approvalStatus ?? null,
    error_message: params.errorMessage ?? null,
    security_flags_json: (params.securityFlags ?? []) as Json,
  });
}
