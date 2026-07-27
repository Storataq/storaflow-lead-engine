"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { setOrchestratorAgentEnabled } from "@/lib/orchestrator/agent";
import {
  controlExecution,
  decideApproval,
  ensureOrchestratorSettings,
  runOrchestration,
  submitGoalAndPlan,
} from "@/lib/orchestrator/engine";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { createClient } from "@/lib/supabase/server";
import { toUserFacingError } from "@/lib/ui/user-facing-error";
import type { Json } from "@/types/supabase";

export type OrchestratorActionResult = {
  success: boolean;
  message: string;
  id?: string;
};

function revalidateOrchestrator() {
  for (const path of [
    "/orchestrator",
    "/orchestrator/live",
    "/orchestrator/agents",
    "/orchestrator/plans",
    "/orchestrator/tasks",
    "/orchestrator/approvals",
    "/orchestrator/executions",
    "/orchestrator/failures",
    "/orchestrator/performance",
    "/orchestrator/costs",
    "/orchestrator/history",
    "/orchestrator/settings",
  ]) {
    revalidatePath(path);
  }
}

export async function submitGoalAction(
  goalText: string,
): Promise<OrchestratorActionResult> {
  try {
    const text = goalText.trim();
    if (text.length < 5) {
      return { success: false, message: "Goal too short." };
    }
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };

    const { goal, plan } = await submitGoalAndPlan({
      organizationId: context.organization.id,
      userId: context.membership.user_id,
      goalText: text,
    });

    const execution = await runOrchestration({
      organizationId: context.organization.id,
      userId: context.membership.user_id,
      goalId: goal.id,
      planId: plan.id,
    });

    revalidateOrchestrator();
    return {
      success: true,
      message:
        execution.status === "awaiting_approval"
          ? "Plan ready — awaiting approval."
          : `Workflow ${execution.status} — ${execution.executive_summary.slice(0, 120) || "running"}.`,
      id: execution.id,
    };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}

export async function controlExecutionAction(
  executionId: string,
  action: "pause" | "resume" | "cancel" | "restart",
): Promise<OrchestratorActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const row = await controlExecution({
      organizationId: context.organization.id,
      userId: context.membership.user_id,
      executionId,
      action,
    });
    revalidateOrchestrator();
    return {
      success: true,
      message: `Execution ${action}: ${row.status}.`,
      id: row.id,
    };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}

export async function decideApprovalAction(
  approvalId: string,
  decision: "approved" | "rejected",
): Promise<OrchestratorActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const row = await decideApproval({
      organizationId: context.organization.id,
      userId: context.membership.user_id,
      approvalId,
      decision,
    });
    revalidateOrchestrator();
    return {
      success: true,
      message:
        decision === "approved"
          ? `Approved — ${row?.status ?? "running"}.`
          : "Workflow rejected.",
      id: row?.id,
    };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}

export async function bulkRunGoalsAction(
  goals: string[],
): Promise<OrchestratorActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const clean = goals.map((g) => g.trim()).filter((g) => g.length >= 5);
    if (!clean.length) {
      return { success: false, message: "No valid goals." };
    }

    const supabase = await createClient();
    const { data: job } = await supabase
      .from("orchestrator_bulk_jobs")
      .insert({
        organization_id: context.organization.id,
        job_type: "bulk_goals",
        status: "running",
        total_count: clean.length,
        input_json: { goals: clean } as Json,
        created_by: context.membership.user_id,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    let success = 0;
    let failure = 0;
    for (const goalText of clean) {
      try {
        const { goal, plan } = await submitGoalAndPlan({
          organizationId: context.organization.id,
          userId: context.membership.user_id,
          goalText,
        });
        await runOrchestration({
          organizationId: context.organization.id,
          userId: context.membership.user_id,
          goalId: goal.id,
          planId: plan.id,
        });
        success += 1;
      } catch {
        failure += 1;
      }
    }

    if (job?.id) {
      await supabase
        .from("orchestrator_bulk_jobs")
        .update({
          status: failure && !success ? "failed" : "completed",
          success_count: success,
          failure_count: failure,
          completed_at: new Date().toISOString(),
          result_json: { success, failure } as Json,
        })
        .eq("id", job.id);
    }

    revalidateOrchestrator();
    return {
      success: true,
      message: `Bulk complete: ${success} ok, ${failure} failed.`,
      id: job?.id,
    };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}

const settingsSchema = z.object({
  enabled: z.boolean(),
  approval_policy: z.string().min(2),
  autonomy_level: z.string().min(2),
  provider: z.string().min(2),
  model: z.string().min(2),
  workflow_timeout_seconds: z.number().int().min(30).max(86400),
  retry_limit: z.number().int().min(0).max(10),
  cost_limit_usd: z.number().min(0),
  rate_limit_per_minute: z.number().int().positive(),
});

export async function updateOrchestratorSettingsAction(
  input: z.infer<typeof settingsSchema>,
): Promise<OrchestratorActionResult> {
  try {
    const parsed = settingsSchema.parse(input);
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (
      context.membership.role !== "owner" &&
      context.membership.role !== "admin"
    ) {
      return { success: false, message: "Owner or admin required." };
    }

    await ensureOrchestratorSettings(context.organization.id);
    const supabase = await createClient();
    const { error } = await supabase
      .from("orchestrator_org_settings")
      .update({
        enabled: parsed.enabled,
        approval_policy: parsed.approval_policy,
        autonomy_level: parsed.autonomy_level,
        provider: parsed.provider,
        model: parsed.model,
        workflow_timeout_seconds: parsed.workflow_timeout_seconds,
        retry_limit: parsed.retry_limit,
        cost_limit_usd: parsed.cost_limit_usd,
        rate_limit_per_minute: parsed.rate_limit_per_minute,
      })
      .eq("organization_id", context.organization.id);
    if (error) throw error;

    await setOrchestratorAgentEnabled(
      context.organization.id,
      parsed.enabled,
    );

    revalidateOrchestrator();
    return { success: true, message: "Orchestrator settings saved." };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}
