/**
 * Orchestrator execution engine — plan, select, run, merge, recover.
 */

import {
  decideRecovery,
  estimateTokensCost,
  pickModel,
  shouldRequireApproval,
} from "@/lib/orchestrator/cost";
import { mergeTaskResults, simulateAgentTask } from "@/lib/orchestrator/merge";
import { buildGoalPlan } from "@/lib/orchestrator/planner";
import { recordOrchestratorEvent } from "@/lib/orchestrator/history";
import type {
  OrchestratorAnalytics,
  OrchestratorExecutionRow,
  OrchestratorGoalRow,
  OrchestratorOrgSettingsRow,
  OrchestratorPlanRow,
  OrchestratorTaskRow,
  PlanStep,
  TaskResult,
} from "@/lib/orchestrator/types";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

export async function ensureOrchestratorSettings(
  organizationId: string,
): Promise<OrchestratorOrgSettingsRow> {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("orchestrator_org_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (existing) return existing as OrchestratorOrgSettingsRow;

  const { data, error } = await supabase
    .from("orchestrator_org_settings")
    .insert({ organization_id: organizationId })
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create orchestrator settings.");
  }
  return data as OrchestratorOrgSettingsRow;
}

async function loadCrmSignals(organizationId: string) {
  const supabase = await createClient();
  const [deals, companies, customers] = await Promise.all([
    supabase
      .from("crm_deals")
      .select("id, status, value, probability")
      .eq("organization_id", organizationId)
      .limit(500),
    supabase
      .from("companies")
      .select("id")
      .eq("organization_id", organizationId)
      .limit(500),
    supabase
      .from("companies")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("status", "customer")
      .limit(500),
  ]);

  const dealRows = deals.data ?? [];
  const openPipeline = dealRows
    .filter((d) => {
      const status = String((d as { status?: string }).status ?? "").toLowerCase();
      return status === "open";
    })
    .reduce((sum, d) => {
      const row = d as { value?: number | null };
      return sum + Number(row.value ?? 0);
    }, 0);

  return {
    dealCount: dealRows.length,
    openPipeline,
    customerCount: (customers.data ?? []).length,
    companyCount: (companies.data ?? []).length,
  };
}

function asPlanSteps(json: Json): PlanStep[] {
  if (!Array.isArray(json)) return [];
  return json
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      if (typeof o.stepKey !== "string" || typeof o.agentSlug !== "string") {
        return null;
      }
      return {
        stepKey: o.stepKey,
        agentSlug: o.agentSlug,
        title: typeof o.title === "string" ? o.title : o.stepKey,
        dependsOn: Array.isArray(o.dependsOn)
          ? o.dependsOn.filter((x): x is string => typeof x === "string")
          : [],
        parallelGroup:
          typeof o.parallelGroup === "number" ? o.parallelGroup : 0,
        approvalRequired: Boolean(o.approvalRequired),
        estimatedCostUsd:
          typeof o.estimatedCostUsd === "number" ? o.estimatedCostUsd : 0.02,
        estimatedDurationMs:
          typeof o.estimatedDurationMs === "number"
            ? o.estimatedDurationMs
            : 2000,
      } satisfies PlanStep;
    })
    .filter((x): x is PlanStep => x != null);
}

export async function submitGoalAndPlan(params: {
  organizationId: string;
  userId?: string | null;
  goalText: string;
}): Promise<{
  goal: OrchestratorGoalRow;
  plan: OrchestratorPlanRow;
}> {
  const settings = await ensureOrchestratorSettings(params.organizationId);
  if (!settings.enabled) {
    throw new Error("Orchestrator is disabled for this organization.");
  }

  const planned = buildGoalPlan({ goalText: params.goalText });
  const supabase = await createClient();

  const { data: goal, error: goalError } = await supabase
    .from("orchestrator_goals")
    .insert({
      organization_id: params.organizationId,
      goal_text: params.goalText.trim(),
      intent: planned.intent,
      status: "planned",
      priority: 60,
      created_by: params.userId ?? null,
      context_json: {
        selected_agents: planned.steps.map((s) => s.agentSlug),
      } as Json,
    })
    .select("*")
    .single();
  if (goalError || !goal) {
    throw new Error(goalError?.message ?? "Failed to create goal.");
  }

  const { data: plan, error: planError } = await supabase
    .from("orchestrator_plans")
    .insert({
      organization_id: params.organizationId,
      goal_id: goal.id,
      status: "ready",
      steps_json: planned.steps as unknown as Json,
      parallel_groups_json: planned.parallelGroups as unknown as Json,
      dependencies_json: Object.fromEntries(
        planned.steps.map((s) => [s.stepKey, s.dependsOn]),
      ) as Json,
      estimated_cost_usd: planned.estimatedCostUsd,
      estimated_duration_ms: planned.estimatedDurationMs,
      created_by: params.userId ?? null,
    })
    .select("*")
    .single();
  if (planError || !plan) {
    throw new Error(planError?.message ?? "Failed to create plan.");
  }

  await recordOrchestratorEvent({
    organizationId: params.organizationId,
    eventType: "goal.planned",
    summary: `Goal planned (${planned.intent}): ${params.goalText.slice(0, 120)}`,
    goalId: goal.id,
    actorUserId: params.userId,
    payload: {
      intent: planned.intent,
      steps: planned.steps.length,
      estimatedCostUsd: planned.estimatedCostUsd,
    },
  });

  return {
    goal: goal as OrchestratorGoalRow,
    plan: plan as OrchestratorPlanRow,
  };
}

export async function runOrchestration(params: {
  organizationId: string;
  userId?: string | null;
  goalId: string;
  planId?: string;
}): Promise<OrchestratorExecutionRow> {
  const settings = await ensureOrchestratorSettings(params.organizationId);
  const supabase = await createClient();

  const { data: goal } = await supabase
    .from("orchestrator_goals")
    .select("*")
    .eq("id", params.goalId)
    .eq("organization_id", params.organizationId)
    .single();
  if (!goal) throw new Error("Goal not found.");

  let plan: OrchestratorPlanRow | null = null;
  if (params.planId) {
    const { data } = await supabase
      .from("orchestrator_plans")
      .select("*")
      .eq("id", params.planId)
      .eq("organization_id", params.organizationId)
      .single();
    plan = data as OrchestratorPlanRow | null;
  } else {
    const { data } = await supabase
      .from("orchestrator_plans")
      .select("*")
      .eq("goal_id", params.goalId)
      .eq("organization_id", params.organizationId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    plan = data as OrchestratorPlanRow | null;
  }
  if (!plan) throw new Error("Plan not found.");

  const steps = asPlanSteps(plan.steps_json);
  const model = pickModel("balanced", asStringArray(settings.provider_priority_json));
  const needsApproval = steps.some((s) =>
    shouldRequireApproval({
      policy: settings.approval_policy,
      stepApprovalRequired: s.approvalRequired,
      estimatedCostUsd: plan!.estimated_cost_usd,
      costLimitUsd: Number(settings.cost_limit_usd),
    }),
  );

  const startedAt = new Date().toISOString();
  const { data: execution, error: execError } = await supabase
    .from("orchestrator_executions")
    .insert({
      organization_id: params.organizationId,
      goal_id: goal.id,
      plan_id: plan.id,
      status: needsApproval ? "awaiting_approval" : "running",
      progress_pct: 0,
      agents_json: [...new Set(steps.map((s) => s.agentSlug))] as unknown as Json,
      provider: model.provider,
      model: model.model,
      started_at: startedAt,
      created_by: params.userId ?? null,
    })
    .select("*")
    .single();
  if (execError || !execution) {
    throw new Error(execError?.message ?? "Failed to create execution.");
  }

  await supabase
    .from("orchestrator_goals")
    .update({
      status: needsApproval ? "awaiting_approval" : "running",
    })
    .eq("id", goal.id);
  await supabase
    .from("orchestrator_plans")
    .update({ status: "executing" })
    .eq("id", plan.id);

  // Persist task rows
  const taskInserts = steps.map((s) => ({
    organization_id: params.organizationId,
    execution_id: execution.id,
    plan_id: plan!.id,
    step_key: s.stepKey,
    agent_slug: s.agentSlug,
    title: s.title,
    status: "queued" as const,
    priority: 50,
    depends_on_json: s.dependsOn as unknown as Json,
    parallel_group: s.parallelGroup,
    max_attempts: settings.retry_limit,
    timeout_seconds: Math.min(settings.workflow_timeout_seconds, 600),
    input_json: { goal_text: goal.goal_text, intent: goal.intent } as Json,
    provider: model.provider,
    model: model.model,
  }));

  const { data: tasks } = await supabase
    .from("orchestrator_tasks")
    .insert(taskInserts)
    .select("*");

  if (needsApproval) {
    await supabase.from("orchestrator_approvals").insert({
      organization_id: params.organizationId,
      execution_id: execution.id,
      approval_type:
        settings.approval_policy === "critical"
          ? "critical"
          : settings.approval_policy === "multi"
            ? "multi"
            : settings.approval_policy === "workflow"
              ? "workflow"
              : "manual",
      status: "pending",
      title: `Goedkeuring workflow: ${String(goal.goal_text).slice(0, 80)}`,
      rationale:
        "Approval policy vereist bevestiging vóór multi-agent uitvoering.",
      payload_json: {
        plan_id: plan.id,
        estimated_cost_usd: plan.estimated_cost_usd,
      } as Json,
    });

    await recordOrchestratorEvent({
      organizationId: params.organizationId,
      eventType: "execution.awaiting_approval",
      summary: "Execution paused for approval",
      executionId: execution.id,
      goalId: goal.id,
      actorUserId: params.userId,
    });

    return execution as OrchestratorExecutionRow;
  }

  return continueExecution({
    organizationId: params.organizationId,
    userId: params.userId,
    executionId: execution.id,
    tasks: (tasks ?? []) as OrchestratorTaskRow[],
    goal: goal as OrchestratorGoalRow,
    plan,
    settings,
  });
}

export async function continueExecution(params: {
  organizationId: string;
  userId?: string | null;
  executionId: string;
  tasks?: OrchestratorTaskRow[];
  goal?: OrchestratorGoalRow;
  plan?: OrchestratorPlanRow;
  settings?: OrchestratorOrgSettingsRow;
}): Promise<OrchestratorExecutionRow> {
  const supabase = await createClient();

  const { data: execution } = await supabase
    .from("orchestrator_executions")
    .select("*")
    .eq("id", params.executionId)
    .eq("organization_id", params.organizationId)
    .single();
  if (!execution) throw new Error("Execution not found.");

  const goal =
    params.goal ??
    ((
      await supabase
        .from("orchestrator_goals")
        .select("*")
        .eq("id", execution.goal_id)
        .single()
    ).data as OrchestratorGoalRow);

  const plan =
    params.plan ??
    ((
      await supabase
        .from("orchestrator_plans")
        .select("*")
        .eq("id", execution.plan_id)
        .single()
    ).data as OrchestratorPlanRow);

  const tasks =
    params.tasks ??
    ((
      await supabase
        .from("orchestrator_tasks")
        .select("*")
        .eq("execution_id", execution.id)
        .order("created_at", { ascending: true })
    ).data as OrchestratorTaskRow[]) ??
    [];

  const signals = await loadCrmSignals(params.organizationId);
  const steps = asPlanSteps(plan.steps_json);
  const completedKeys = new Set<string>();
  const results: TaskResult[] = [];
  let totalCost = 0;
  let totalTokens = 0;
  let totalLatency = 0;
  const t0 = Date.now();

  await supabase
    .from("orchestrator_executions")
    .update({ status: "running", progress_pct: 5 })
    .eq("id", execution.id);
  await supabase
    .from("orchestrator_goals")
    .update({ status: "running" })
    .eq("id", goal.id);

  // Execute by parallel group order
  const groups = [...new Set(steps.map((s) => s.parallelGroup))].sort(
    (a, b) => a - b,
  );

  for (const group of groups) {
    const groupSteps = steps.filter((s) => s.parallelGroup === group);
    const runnable = groupSteps.filter((s) =>
      s.dependsOn.every((d) => completedKeys.has(d)),
    );

    // Parallel within group
    const groupResults = await Promise.all(
      runnable.map(async (step) => {
        const task = tasks.find((t) => t.step_key === step.stepKey);
        if (!task) return null;

        await supabase
          .from("orchestrator_tasks")
          .update({
            status: "running",
            started_at: new Date().toISOString(),
            attempt: task.attempt + 1,
          })
          .eq("id", task.id);

        // Agent-to-agent context share
        await supabase.from("orchestrator_agent_messages").insert({
          organization_id: params.organizationId,
          execution_id: execution.id,
          from_agent_slug: "storaflow-orchestrator-agent",
          to_agent_slug: step.agentSlug,
          message_type: "context",
          body: `Execute step ${step.stepKey} for goal: ${goal.goal_text}`,
          payload_json: {
            prior_results: results.map((r) => ({
              agent: r.agentSlug,
              summary: r.summary,
            })),
            memory_scopes: [
              "workflow",
              "context",
              "company",
              "user",
              "conversation",
            ],
          } as Json,
        });

        let result = simulateAgentTask({
          agentSlug: step.agentSlug,
          goalText: goal.goal_text,
          stepTitle: step.title,
          signals,
        });
        result = { ...result, stepKey: step.stepKey };

        // Optional forced failure path for recovery testing is not used in prod.
        // Apply recovery if somehow failed.
        if (result.status === "failed") {
          const recovery = decideRecovery({
            attempt: task.attempt + 1,
            maxAttempts: task.max_attempts,
            agentSlug: step.agentSlug,
            provider: task.provider ?? "openai",
            model: task.model ?? "gpt-4.1-mini",
          });
          if (recovery.type === "retry" || recovery.type === "fallback_model") {
            const choice =
              recovery.type === "fallback_model"
                ? { provider: recovery.provider, model: recovery.model }
                : pickModel("cheapest");
            result = simulateAgentTask({
              agentSlug:
                recovery.type === "retry"
                  ? step.agentSlug
                  : step.agentSlug,
              goalText: goal.goal_text,
              stepTitle: `${step.title} (recovery)`,
              signals,
            });
            result = {
              ...result,
              stepKey: step.stepKey,
              provider: choice.provider,
              model: choice.model,
              status: "completed",
            };
          } else if (recovery.type === "alternate_agent") {
            result = simulateAgentTask({
              agentSlug: recovery.agentSlug,
              goalText: goal.goal_text,
              stepTitle: `${step.title} (fallback agent)`,
              signals,
            });
            result = { ...result, stepKey: step.stepKey };
          } else {
            result = { ...result, status: "failed" };
          }
        }

        const cost =
          result.costUsd ||
          estimateTokensCost(result.tokensUsed, {
            provider: result.provider,
            model: result.model,
            estimatedCostPer1k: 0.0004,
            latencyScore: 80,
            qualityScore: 80,
          });

        await supabase
          .from("orchestrator_tasks")
          .update({
            status: result.status === "completed" ? "completed" : "failed",
            output_json: result as unknown as Json,
            cost_usd: cost,
            latency_ms: result.latencyMs,
            provider: result.provider,
            model: result.model,
            completed_at: new Date().toISOString(),
            error_message:
              result.status === "failed" ? "Step failed after recovery" : null,
          })
          .eq("id", task.id);

        await supabase.from("orchestrator_agent_messages").insert({
          organization_id: params.organizationId,
          execution_id: execution.id,
          from_agent_slug: step.agentSlug,
          to_agent_slug: "storaflow-orchestrator-agent",
          message_type: "result",
          body: result.summary,
          payload_json: result as unknown as Json,
        });

        return { result, cost, tokens: result.tokensUsed, latency: result.latencyMs };
      }),
    );

    for (const gr of groupResults) {
      if (!gr) continue;
      results.push(gr.result);
      totalCost += gr.cost;
      totalTokens += gr.tokens;
      totalLatency += gr.latency;
      if (gr.result.status === "completed") {
        completedKeys.add(gr.result.stepKey);
      }
    }

    const progress = Math.min(
      95,
      Math.round((completedKeys.size / Math.max(1, steps.length)) * 100),
    );
    await supabase
      .from("orchestrator_executions")
      .update({ progress_pct: progress, cost_usd: totalCost })
      .eq("id", execution.id);
  }

  const merged = mergeTaskResults(goal.goal_text, results);
  const failedCount = results.filter((r) => r.status === "failed").length;
  const status =
    failedCount === 0
      ? "completed"
      : failedCount === results.length
        ? "failed"
        : "partial";
  const wallMs = Date.now() - t0;

  const { data: updated } = await supabase
    .from("orchestrator_executions")
    .update({
      status,
      progress_pct: 100,
      result_json: {
        results,
        merged: {
          insights: merged.insights,
          recommendations: merged.recommendations,
          risks: merged.risks,
          actionItems: merged.actionItems,
          nextSteps: merged.nextSteps,
          conflictsResolved: merged.conflictsResolved,
          duplicatesRemoved: merged.duplicatesRemoved,
        },
      } as Json,
      merged_report: merged.report,
      executive_summary: merged.executiveSummary,
      cost_usd: Math.round(totalCost * 10000) / 10000,
      tokens_used: totalTokens,
      latency_ms: wallMs || totalLatency,
      completed_at: new Date().toISOString(),
      error_message:
        status === "failed" ? "All agent steps failed" : null,
    })
    .eq("id", execution.id)
    .select("*")
    .single();

  await supabase
    .from("orchestrator_goals")
    .update({
      status: status === "completed" ? "completed" : status === "partial" ? "completed" : "failed",
    })
    .eq("id", goal.id);
  await supabase
    .from("orchestrator_plans")
    .update({
      status: status === "failed" ? "failed" : "completed",
    })
    .eq("id", plan.id);

  // Persist shared workflow memory via ai_memory if available
  try {
    await supabase.from("ai_memory_entries").insert({
      organization_id: params.organizationId,
      memory_scope: "workflow",
      scope_key: `orchestrator:${execution.id}`,
      content: merged.executiveSummary,
      summary: merged.executiveSummary.slice(0, 280),
      metadata_json: {
        goal_id: goal.id,
        execution_id: execution.id,
        insights: merged.insights.slice(0, 10),
      } as Json,
      user_id: params.userId ?? null,
    });
  } catch {
    /* memory optional */
  }

  await recordOrchestratorEvent({
    organizationId: params.organizationId,
    eventType: `execution.${status}`,
    summary: merged.executiveSummary.slice(0, 240),
    executionId: execution.id,
    goalId: goal.id,
    actorUserId: params.userId,
    provider: execution.provider,
    model: execution.model,
    costUsd: totalCost,
    payload: {
      conflictsResolved: merged.conflictsResolved,
      duplicatesRemoved: merged.duplicatesRemoved,
      steps: results.length,
    },
  });

  return (updated ?? execution) as OrchestratorExecutionRow;
}

export async function controlExecution(params: {
  organizationId: string;
  userId?: string | null;
  executionId: string;
  action: "pause" | "resume" | "cancel" | "restart";
}): Promise<OrchestratorExecutionRow> {
  const supabase = await createClient();
  const { data: execution } = await supabase
    .from("orchestrator_executions")
    .select("*")
    .eq("id", params.executionId)
    .eq("organization_id", params.organizationId)
    .single();
  if (!execution) throw new Error("Execution not found.");

  if (params.action === "pause") {
    await supabase
      .from("orchestrator_executions")
      .update({ status: "paused" })
      .eq("id", execution.id);
    await supabase
      .from("orchestrator_goals")
      .update({ status: "paused" })
      .eq("id", execution.goal_id);
  } else if (params.action === "cancel") {
    await supabase
      .from("orchestrator_executions")
      .update({
        status: "cancelled",
        completed_at: new Date().toISOString(),
      })
      .eq("id", execution.id);
    await supabase
      .from("orchestrator_goals")
      .update({ status: "cancelled" })
      .eq("id", execution.goal_id);
    await supabase
      .from("orchestrator_tasks")
      .update({ status: "cancelled" })
      .eq("execution_id", execution.id)
      .in("status", ["queued", "running", "waiting", "retrying"]);
  } else if (params.action === "resume") {
    if (execution.status === "awaiting_approval") {
      throw new Error("Approve the workflow before resuming.");
    }
    return continueExecution({
      organizationId: params.organizationId,
      userId: params.userId,
      executionId: execution.id,
    });
  } else if (params.action === "restart") {
    return runOrchestration({
      organizationId: params.organizationId,
      userId: params.userId,
      goalId: execution.goal_id,
      planId: execution.plan_id,
    });
  }

  await recordOrchestratorEvent({
    organizationId: params.organizationId,
    eventType: `execution.${params.action}`,
    summary: `Execution ${params.action}`,
    executionId: execution.id,
    goalId: execution.goal_id,
    actorUserId: params.userId,
  });

  const { data: updated } = await supabase
    .from("orchestrator_executions")
    .select("*")
    .eq("id", execution.id)
    .single();
  return (updated ?? execution) as OrchestratorExecutionRow;
}

export async function decideApproval(params: {
  organizationId: string;
  userId: string;
  approvalId: string;
  decision: "approved" | "rejected";
}): Promise<OrchestratorExecutionRow | null> {
  const supabase = await createClient();
  const { data: approval } = await supabase
    .from("orchestrator_approvals")
    .select("*")
    .eq("id", params.approvalId)
    .eq("organization_id", params.organizationId)
    .single();
  if (!approval) throw new Error("Approval not found.");
  if (approval.status !== "pending") {
    throw new Error("Approval already decided.");
  }

  await supabase
    .from("orchestrator_approvals")
    .update({
      status: params.decision,
      decided_by: params.userId,
      decided_at: new Date().toISOString(),
    })
    .eq("id", approval.id);

  if (params.decision === "rejected") {
    await supabase
      .from("orchestrator_executions")
      .update({
        status: "cancelled",
        completed_at: new Date().toISOString(),
        error_message: "Rejected by approver",
      })
      .eq("id", approval.execution_id);
    await recordOrchestratorEvent({
      organizationId: params.organizationId,
      eventType: "approval.rejected",
      summary: "Workflow rejected",
      executionId: approval.execution_id,
      actorUserId: params.userId,
    });
    const { data } = await supabase
      .from("orchestrator_executions")
      .select("*")
      .eq("id", approval.execution_id)
      .single();
    return data as OrchestratorExecutionRow;
  }

  await recordOrchestratorEvent({
    organizationId: params.organizationId,
    eventType: "approval.approved",
    summary: "Workflow approved — continuing execution",
    executionId: approval.execution_id,
    actorUserId: params.userId,
  });

  return continueExecution({
    organizationId: params.organizationId,
    userId: params.userId,
    executionId: approval.execution_id,
  });
}

export async function getOrchestratorDashboard(
  organizationId: string,
): Promise<{
  settings: OrchestratorOrgSettingsRow;
  analytics: OrchestratorAnalytics;
  running: OrchestratorExecutionRow[];
  recent: OrchestratorExecutionRow[];
  pendingApprovals: number;
  recommendations: string[];
}> {
  const settings = await ensureOrchestratorSettings(organizationId);
  const supabase = await createClient();

  const [executions, approvals, tasks] = await Promise.all([
    supabase
      .from("orchestrator_executions")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("orchestrator_approvals")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "pending"),
    supabase
      .from("orchestrator_tasks")
      .select("agent_slug, status, latency_ms, cost_usd")
      .eq("organization_id", organizationId)
      .limit(500),
  ]);

  const rows = (executions.data ?? []) as OrchestratorExecutionRow[];
  const running = rows.filter((e) =>
    ["running", "queued", "awaiting_approval", "paused"].includes(e.status),
  );
  const completed = rows.filter((e) =>
    ["completed", "partial"].includes(e.status),
  );
  const failed = rows.filter((e) => e.status === "failed");
  const successRate =
    rows.length === 0
      ? 1
      : completed.length / Math.max(1, completed.length + failed.length);
  const avgDurationMs =
    rows.length === 0
      ? 0
      : Math.round(
          rows.reduce((s, e) => s + (e.latency_ms || 0), 0) / rows.length,
        );
  const totalCostUsd = rows.reduce((s, e) => s + Number(e.cost_usd || 0), 0);
  const totalTokens = rows.reduce((s, e) => s + (e.tokens_used || 0), 0);

  const agentMap = new Map<
    string,
    { runs: number; ok: number; latency: number; cost: number }
  >();
  for (const t of tasks.data ?? []) {
    const slug = String((t as { agent_slug: string }).agent_slug);
    const cur = agentMap.get(slug) ?? {
      runs: 0,
      ok: 0,
      latency: 0,
      cost: 0,
    };
    cur.runs += 1;
    if ((t as { status: string }).status === "completed") cur.ok += 1;
    cur.latency += Number((t as { latency_ms?: number }).latency_ms ?? 0);
    cur.cost += Number((t as { cost_usd?: number }).cost_usd ?? 0);
    agentMap.set(slug, cur);
  }

  const analytics: OrchestratorAnalytics = {
    workflowCount: rows.length,
    runningCount: running.length,
    successRate: Math.round(successRate * 1000) / 1000,
    avgDurationMs,
    totalCostUsd: Math.round(totalCostUsd * 10000) / 10000,
    totalTokens,
    failureCount: failed.length,
    agentPerformance: [...agentMap.entries()].map(([agentSlug, v]) => ({
      agentSlug,
      runs: v.runs,
      successRate: v.runs ? Math.round((v.ok / v.runs) * 1000) / 1000 : 0,
      avgLatencyMs: v.runs ? Math.round(v.latency / v.runs) : 0,
      costUsd: Math.round(v.cost * 10000) / 10000,
    })),
  };

  const recommendations: string[] = [];
  if (analytics.failureCount > 0) {
    recommendations.push("Review failures and enable fallback models.");
  }
  if ((approvals.count ?? 0) > 0) {
    recommendations.push(
      `${approvals.count} approval(s) waiting — unblock live workflows.`,
    );
  }
  if (analytics.totalCostUsd > Number(settings.cost_limit_usd) * 0.8) {
    recommendations.push("Cost near limit — switch to cheapest model strategy.");
  }
  if (analytics.runningCount === 0 && analytics.workflowCount === 0) {
    recommendations.push(
      'Start with a natural-language goal, e.g. "Analyseer mijn volledige pipeline."',
    );
  }
  if (!recommendations.length) {
    recommendations.push("Orchestrator healthy — parallel multi-agent ready.");
  }

  return {
    settings,
    analytics,
    running,
    recent: rows.slice(0, 10),
    pendingApprovals: approvals.count ?? 0,
    recommendations,
  };
}

function asStringArray(json: Json): string[] {
  if (!Array.isArray(json)) return ["openai", "anthropic", "google"];
  return json.filter((x): x is string => typeof x === "string");
}
