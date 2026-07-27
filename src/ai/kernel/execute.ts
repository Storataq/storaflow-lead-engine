/**
 * AI Kernel — orchestrates plan → tools → model → memory → cost → logs.
 */

import {
  ensureSystemKernelAgent,
  setAgentStatus,
} from "@/ai/agents/registry";
import {
  resolveEffectiveApprovalMode,
  requestApproval,
  requiresHumanApproval,
} from "@/ai/approvals/engine";
import {
  buildAgentContext,
  formatContextForPrompt,
} from "@/ai/context/builder";
import { recordCost } from "@/ai/costs/ledger";
import { emitAiEvent } from "@/ai/events/bus";
import { writeExecutionLog } from "@/ai/logging/execution";
import { saveMemory } from "@/ai/memory/engine";
import { buildExecutionPlan } from "@/ai/planner/planner";
import { routeComplete } from "@/ai/providers/router";
import {
  checkRateLimit,
  rateLimitKey,
  scanUserInput,
} from "@/ai/security/engine";
import {
  completeTask,
  enqueuePlanTasks,
  failTask,
} from "@/ai/tasks/queue";
import { invokeTool } from "@/ai/tools/calling";
import type { ApprovalMode } from "@/ai/constants";
import type { AiAgentRow, AiOrgSettingsRow, AiRunRow } from "@/ai/types";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

function permissionsFromAgent(agent: AiAgentRow): string[] {
  const raw = agent.permissions_json;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return [
      "companies:read",
      "contacts:read",
      "deals:read",
      "tasks:read",
      "memory:read",
      "memory:write",
      "knowledge:read",
      "analytics:read",
    ];
  }
  return Object.entries(raw as Record<string, unknown>)
    .filter(([, v]) => Boolean(v))
    .map(([k]) => k);
}

export async function ensureOrgAiSettings(
  organizationId: string,
): Promise<AiOrgSettingsRow> {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("ai_org_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (existing) return existing as AiOrgSettingsRow;

  const { data, error } = await supabase
    .from("ai_org_settings")
    .insert({ organization_id: organizationId })
    .select("*")
    .single();
  if (error || !data) {
    return {
      organization_id: organizationId,
      default_provider: "openai",
      default_model: "gpt-4.1-mini",
      failover_providers: ["openai", "anthropic"],
      approval_mode: "approval_required",
      max_tokens_per_request: 4096,
      monthly_budget_usd: null,
      memory_enabled: true,
      logging_enabled: true,
      security_strict: true,
      rate_limit_per_minute: 60,
      prompt_policy_json: {},
      tool_policy_json: {},
      metadata_json: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
  return data as AiOrgSettingsRow;
}

export type KernelRunInput = {
  organizationId: string;
  organizationName: string;
  userId: string;
  userRole: string;
  inputText: string;
  agentSlug?: string;
  locale?: string;
  timezone?: string;
};

export type KernelRunResult = {
  success: boolean;
  runId?: string;
  status?: string;
  outputText?: string;
  message: string;
  needsApproval?: boolean;
};

export async function executeKernelRun(
  input: KernelRunInput,
): Promise<KernelRunResult> {
  const settings = await ensureOrgAiSettings(input.organizationId);
  const rate = checkRateLimit(
    rateLimitKey(input.organizationId, input.userId),
    settings.rate_limit_per_minute,
  );
  if (!rate.allowed) {
    return {
      success: false,
      message: "AI rate limit exceeded. Try again in a minute.",
    };
  }

  const scan = scanUserInput(input.inputText, {
    strict: settings.security_strict,
  });
  if (!scan.allowed) {
    return {
      success: false,
      message: `Request blocked by security engine (${scan.flags.join(", ")}).`,
    };
  }

  const agent =
    (await ensureSystemKernelAgent(input.organizationId, input.userId)) ??
    null;
  if (!agent) {
    return { success: false, message: "Failed to register kernel agent." };
  }

  const supabase = await createClient();
  const plan = buildExecutionPlan(scan.sanitizedInput);
  const approvalMode = resolveEffectiveApprovalMode(
    settings.approval_mode,
    agent.approval_mode,
  );

  const { data: run, error: runError } = await supabase
    .from("ai_runs")
    .insert({
      organization_id: input.organizationId,
      agent_id: agent.id,
      initiated_by: input.userId,
      status: "planning",
      input_text: scan.sanitizedInput,
      input_json: { securityFlags: scan.flags } as Json,
      plan_json: plan as unknown as Json,
    })
    .select("*")
    .single();

  if (runError || !run) {
    return { success: false, message: "Failed to create AI run." };
  }

  const runRow = run as AiRunRow;
  await emitAiEvent({
    organizationId: input.organizationId,
    eventType: "run.started",
    agentId: agent.id,
    runId: runRow.id,
  });

  await setAgentStatus({
    organizationId: input.organizationId,
    agentId: agent.id,
    from: (agent.status as "idle") || "idle",
    to: "planning",
  });

  const tasks = await enqueuePlanTasks({
    organizationId: input.organizationId,
    runId: runRow.id,
    subtasks: plan.subtasks,
  });

  const mutating = plan.subtasks.some((s) => s.toolName === "memory.save");
  const actionKind = mutating ? "write" : "read";

  if (requiresHumanApproval(approvalMode as ApprovalMode, actionKind)) {
    await requestApproval({
      organizationId: input.organizationId,
      runId: runRow.id,
      requestedBy: input.userId,
      actionSummary: `Execute AI run: ${scan.sanitizedInput.slice(0, 160)}`,
      payload: { plan },
    });
    await supabase
      .from("ai_runs")
      .update({ status: "needs_approval", approval_status: "pending" })
      .eq("id", runRow.id);
    await setAgentStatus({
      organizationId: input.organizationId,
      agentId: agent.id,
      from: "planning",
      to: "needs_approval",
    });
    await emitAiEvent({
      organizationId: input.organizationId,
      eventType: "approval.requested",
      agentId: agent.id,
      runId: runRow.id,
    });
    return {
      success: true,
      runId: runRow.id,
      status: "needs_approval",
      needsApproval: true,
      message: "Run awaiting approval.",
    };
  }

  return continueKernelRun({
    organizationId: input.organizationId,
    organizationName: input.organizationName,
    userId: input.userId,
    userRole: input.userRole,
    locale: input.locale,
    timezone: input.timezone,
    run: runRow,
    agent,
    settings,
    tasks,
    sanitizedInput: scan.sanitizedInput,
    securityFlags: scan.flags,
    approvalMode: approvalMode as ApprovalMode,
  });
}

export async function continueKernelRun(params: {
  organizationId: string;
  organizationName: string;
  userId: string;
  userRole: string;
  locale?: string;
  timezone?: string;
  run: AiRunRow;
  agent: AiAgentRow;
  settings: AiOrgSettingsRow;
  tasks: { id: string; tool_name: string | null; input_json: Json; attempt: number; max_attempts: number }[];
  sanitizedInput: string;
  securityFlags: string[];
  approvalMode: ApprovalMode;
}): Promise<KernelRunResult> {
  const supabase = await createClient();
  const started = Date.now();

  await supabase
    .from("ai_runs")
    .update({
      status: "running",
      started_at: new Date().toISOString(),
      approval_status:
        params.approvalMode === "fully_autonomous" ||
        params.approvalMode === "semi_autonomous"
          ? "bypassed"
          : params.run.approval_status,
    })
    .eq("id", params.run.id);

  await setAgentStatus({
    organizationId: params.organizationId,
    agentId: params.agent.id,
    from: "needs_approval",
    to: "running",
  }).catch(() => undefined);
  await setAgentStatus({
    organizationId: params.organizationId,
    agentId: params.agent.id,
    from: "planning",
    to: "running",
  }).catch(() => undefined);

  const granted = permissionsFromAgent(params.agent);
  const toolOutputs: Record<string, unknown>[] = [];

  for (const task of params.tasks) {
    if (!task.tool_name) {
      await completeTask(task.id, params.organizationId, { skipped: true });
      continue;
    }

    const inputObj =
      task.input_json &&
      typeof task.input_json === "object" &&
      !Array.isArray(task.input_json)
        ? (task.input_json as Record<string, unknown>)
        : { query: params.sanitizedInput };

    const result = await invokeTool({
      organizationId: params.organizationId,
      userId: params.userId,
      agentId: params.agent.id,
      runId: params.run.id,
      toolKey: task.tool_name,
      input: inputObj,
      grantedPermissions: granted,
    });

    if (!result.ok) {
      await failTask({
        taskId: task.id,
        organizationId: params.organizationId,
        errorMessage: result.error ?? "tool failed",
        maxAttempts: task.max_attempts,
        attempt: task.attempt + 1,
      });
    } else {
      await completeTask(task.id, params.organizationId, result.output);
      toolOutputs.push({ tool: task.tool_name, output: result.output });
    }
  }

  const ctx = await buildAgentContext({
    organizationId: params.organizationId,
    organizationName: params.organizationName,
    userId: params.userId,
    userRole: params.userRole,
    locale: params.locale,
    timezone: params.timezone,
    permissions: granted,
    agentId: params.agent.id,
    query: params.sanitizedInput,
  });

  const failover =
    Array.isArray(params.settings.failover_providers)
      ? (params.settings.failover_providers as string[])
      : ["openai", "anthropic", "gemini"];

  try {
    const completion = await routeComplete(
      {
        system: [
          params.agent.system_prompt,
          formatContextForPrompt(ctx),
          "Tool results (JSON):",
          JSON.stringify(toolOutputs).slice(0, 12_000),
        ].join("\n\n"),
        user: params.sanitizedInput,
        model: params.agent.model || params.settings.default_model,
        temperature: Number(params.agent.temperature) || 0.3,
        maxTokens: Math.min(
          params.agent.max_tokens,
          params.settings.max_tokens_per_request,
        ),
        timeoutMs: params.agent.timeout_ms,
      },
      {
        preferredProvider: (params.agent.provider ||
          params.settings.default_provider) as "openai",
        failoverProviders: failover as ("openai" | "anthropic" | "gemini")[],
        onFailover: async (from, to, reason) => {
          await emitAiEvent({
            organizationId: params.organizationId,
            eventType: "provider.failover",
            agentId: params.agent.id,
            runId: params.run.id,
            payload: { from, to, reason },
          });
        },
      },
    );

    const latencyMs = Date.now() - started;
    await supabase
      .from("ai_runs")
      .update({
        status: "completed",
        output_text: completion.content,
        output_json: {
          toolOutputs,
          attemptedProviders: completion.attemptedProviders,
          failoverUsed: completion.failoverUsed,
        } as Json,
        provider: completion.provider,
        model: completion.model,
        tokens_in: completion.usage.inputTokens,
        tokens_out: completion.usage.outputTokens,
        cost_usd: completion.usage.estimatedCostUsd,
        latency_ms: latencyMs,
        completed_at: new Date().toISOString(),
      })
      .eq("id", params.run.id);

    await recordCost({
      organizationId: params.organizationId,
      userId: params.userId,
      agentId: params.agent.id,
      runId: params.run.id,
      provider: completion.provider,
      model: completion.model,
      tokensIn: completion.usage.inputTokens,
      tokensOut: completion.usage.outputTokens,
      costUsd: completion.usage.estimatedCostUsd,
    });

    if (params.settings.memory_enabled) {
      await saveMemory({
        organizationId: params.organizationId,
        scope: "conversation",
        content: `Q: ${params.sanitizedInput}\nA: ${completion.content}`.slice(
          0,
          4000,
        ),
        agentId: params.agent.id,
        runId: params.run.id,
        userId: params.userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    if (params.settings.logging_enabled) {
      await writeExecutionLog({
        organizationId: params.organizationId,
        runId: params.run.id,
        agentId: params.agent.id,
        userId: params.userId,
        provider: completion.provider,
        model: completion.model,
        inputPreview: params.sanitizedInput,
        outputPreview: completion.content,
        tokensIn: completion.usage.inputTokens,
        tokensOut: completion.usage.outputTokens,
        costUsd: completion.usage.estimatedCostUsd,
        latencyMs,
        securityFlags: params.securityFlags,
      });
    }

    await emitAiEvent({
      organizationId: params.organizationId,
      eventType: "run.completed",
      agentId: params.agent.id,
      runId: params.run.id,
      payload: { costUsd: completion.usage.estimatedCostUsd },
    });

    await setAgentStatus({
      organizationId: params.organizationId,
      agentId: params.agent.id,
      from: "running",
      to: "completed",
    });
    await setAgentStatus({
      organizationId: params.organizationId,
      agentId: params.agent.id,
      from: "completed",
      to: "idle",
    });

    return {
      success: true,
      runId: params.run.id,
      status: "completed",
      outputText: completion.content,
      message: "Run completed.",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI run failed";
    await supabase
      .from("ai_runs")
      .update({
        status: "failed",
        error_message: message,
        completed_at: new Date().toISOString(),
        latency_ms: Date.now() - started,
      })
      .eq("id", params.run.id);

    await writeExecutionLog({
      organizationId: params.organizationId,
      runId: params.run.id,
      agentId: params.agent.id,
      userId: params.userId,
      inputPreview: params.sanitizedInput,
      errorMessage: message,
      latencyMs: Date.now() - started,
      securityFlags: params.securityFlags,
    });

    await emitAiEvent({
      organizationId: params.organizationId,
      eventType: "run.failed",
      agentId: params.agent.id,
      runId: params.run.id,
      payload: { message },
    });

    await setAgentStatus({
      organizationId: params.organizationId,
      agentId: params.agent.id,
      from: "running",
      to: "failed",
    });

    return {
      success: false,
      runId: params.run.id,
      status: "failed",
      message,
    };
  }
}
