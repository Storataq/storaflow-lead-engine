"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { registerAgent } from "@/ai/agents/registry";
import { resolveApproval } from "@/ai/approvals/engine";
import { upsertKnowledgeDocument } from "@/ai/knowledge/engine";
import {
  continueKernelRun,
  ensureOrgAiSettings,
  executeKernelRun,
} from "@/ai/kernel/execute";
import { upsertPromptTemplate } from "@/ai/prompts/library";
import { upsertWorkflow } from "@/ai/workflows/engine";
import type { ApprovalMode, KnowledgeSourceType } from "@/ai/constants";
import type { AiAgentRow, AiOrgSettingsRow, AiRunRow } from "@/ai/types";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { createClient } from "@/lib/supabase/server";
import { toUserFacingError } from "@/lib/ui/user-facing-error";
import type { Json } from "@/types/supabase";

export type AiActionResult = {
  success: boolean;
  message: string;
  id?: string;
  outputText?: string;
  status?: string;
};

function revalidateAi() {
  for (const path of [
    "/ai-platform",
    "/ai-platform/agents",
    "/ai-platform/tasks",
    "/ai-platform/workflows",
    "/ai-platform/memory",
    "/ai-platform/knowledge",
    "/ai-platform/prompts",
    "/ai-platform/tools",
    "/ai-platform/providers",
    "/ai-platform/costs",
    "/ai-platform/logs",
    "/ai-platform/security",
    "/ai-platform/settings",
  ]) {
    revalidatePath(path);
  }
}

const runSchema = z.object({
  inputText: z.string().min(1).max(20_000),
});

export async function startAiRunAction(
  input: z.infer<typeof runSchema>,
): Promise<AiActionResult> {
  try {
    const parsed = runSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: "Invalid input." };
    }
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };

    const result = await executeKernelRun({
      organizationId: context.organization.id,
      organizationName: context.organization.name,
      userId: context.membership.user_id,
      userRole: context.membership.role,
      inputText: parsed.data.inputText,
    });

    revalidateAi();
    return {
      success: result.success,
      message: result.message,
      id: result.runId,
      outputText: result.outputText,
      status: result.status,
    };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}

export async function approveAiRunAction(params: {
  approvalId: string;
  decision: "approved" | "rejected";
  note?: string;
}): Promise<AiActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (
      context.membership.role !== "owner" &&
      context.membership.role !== "admin"
    ) {
      return { success: false, message: "Only admins can approve AI runs." };
    }

    const ok = await resolveApproval({
      organizationId: context.organization.id,
      approvalId: params.approvalId,
      reviewerUserId: context.membership.user_id,
      decision: params.decision,
      note: params.note,
    });
    if (!ok) return { success: false, message: "Approval update failed." };

    if (params.decision === "rejected") {
      const supabase = await createClient();
      const { data: approval } = await supabase
        .from("ai_approvals")
        .select("run_id")
        .eq("id", params.approvalId)
        .eq("organization_id", context.organization.id)
        .maybeSingle();
      if (approval?.run_id) {
        await supabase
          .from("ai_runs")
          .update({
            status: "cancelled",
            approval_status: "rejected",
            completed_at: new Date().toISOString(),
          })
          .eq("id", approval.run_id);
      }
      revalidateAi();
      return { success: true, message: "Run rejected." };
    }

    const supabase = await createClient();
    const { data: approval } = await supabase
      .from("ai_approvals")
      .select("*")
      .eq("id", params.approvalId)
      .eq("organization_id", context.organization.id)
      .maybeSingle();
    if (!approval?.run_id) {
      return { success: false, message: "Approval not found." };
    }

    const { data: run } = await supabase
      .from("ai_runs")
      .select("*")
      .eq("id", approval.run_id)
      .maybeSingle();
    const { data: agent } = await supabase
      .from("ai_agents")
      .select("*")
      .eq("id", run?.agent_id ?? "")
      .maybeSingle();
    const { data: tasks } = await supabase
      .from("ai_tasks")
      .select("id, tool_name, input_json, attempt, max_attempts")
      .eq("run_id", approval.run_id);

    if (!run || !agent) {
      return { success: false, message: "Run or agent missing." };
    }

    await supabase
      .from("ai_runs")
      .update({ approval_status: "approved" })
      .eq("id", run.id);

    const settings = await ensureOrgAiSettings(context.organization.id);
    const result = await continueKernelRun({
      organizationId: context.organization.id,
      organizationName: context.organization.name,
      userId: context.membership.user_id,
      userRole: context.membership.role,
      run: run as AiRunRow,
      agent: agent as AiAgentRow,
      settings: settings as AiOrgSettingsRow,
      tasks: (tasks ?? []) as {
        id: string;
        tool_name: string | null;
        input_json: Json;
        attempt: number;
        max_attempts: number;
      }[],
      sanitizedInput: run.input_text,
      securityFlags: [],
      approvalMode: "fully_autonomous" as ApprovalMode,
    });

    revalidateAi();
    return {
      success: result.success,
      message: result.message,
      id: result.runId,
      outputText: result.outputText,
      status: result.status,
    };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}

const agentSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
  approvalMode: z.string().optional(),
});

export async function registerAgentAction(
  input: z.infer<typeof agentSchema>,
): Promise<AiActionResult> {
  try {
    const parsed = agentSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Invalid agent." };
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (
      context.membership.role !== "owner" &&
      context.membership.role !== "admin"
    ) {
      return { success: false, message: "Only admins can register agents." };
    }

    const agent = await registerAgent({
      organizationId: context.organization.id,
      slug: parsed.data.slug,
      name: parsed.data.name,
      description: parsed.data.description,
      provider: parsed.data.provider,
      model: parsed.data.model,
      approvalMode: parsed.data.approvalMode,
      ownerUserId: context.membership.user_id,
    });
    if (!agent) return { success: false, message: "Failed to register agent." };
    revalidateAi();
    return {
      success: true,
      message: "Agent registered.",
      id: agent.id,
    };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}

const settingsSchema = z.object({
  default_provider: z.string(),
  default_model: z.string().min(1).max(120),
  approval_mode: z.string(),
  max_tokens_per_request: z.number().int().min(256).max(128000),
  rate_limit_per_minute: z.number().int().min(1).max(1000),
  memory_enabled: z.boolean(),
  logging_enabled: z.boolean(),
  security_strict: z.boolean(),
  monthly_budget_usd: z.number().nullable().optional(),
});

export async function updateAiSettingsAction(
  input: z.infer<typeof settingsSchema>,
): Promise<AiActionResult> {
  try {
    const parsed = settingsSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Invalid settings." };
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (
      context.membership.role !== "owner" &&
      context.membership.role !== "admin"
    ) {
      return { success: false, message: "Only admins can update AI settings." };
    }

    await ensureOrgAiSettings(context.organization.id);
    const supabase = await createClient();
    const { error } = await supabase
      .from("ai_org_settings")
      .update({
        default_provider: parsed.data.default_provider,
        default_model: parsed.data.default_model,
        approval_mode: parsed.data.approval_mode,
        max_tokens_per_request: parsed.data.max_tokens_per_request,
        rate_limit_per_minute: parsed.data.rate_limit_per_minute,
        memory_enabled: parsed.data.memory_enabled,
        logging_enabled: parsed.data.logging_enabled,
        security_strict: parsed.data.security_strict,
        monthly_budget_usd: parsed.data.monthly_budget_usd ?? null,
      })
      .eq("organization_id", context.organization.id);

    if (error) return { success: false, message: error.message };
    revalidateAi();
    return { success: true, message: "AI settings updated." };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}

export async function createKnowledgeAction(input: {
  title: string;
  body: string;
  sourceType: KnowledgeSourceType;
}): Promise<AiActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const row = await upsertKnowledgeDocument({
      organizationId: context.organization.id,
      sourceType: input.sourceType,
      title: input.title,
      body: input.body,
    });
    if (!row) return { success: false, message: "Failed to save knowledge." };
    revalidateAi();
    return { success: true, message: "Knowledge saved.", id: row.id };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}

export async function createPromptAction(input: {
  slug: string;
  name: string;
  templateBody: string;
  category?: string;
}): Promise<AiActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const row = await upsertPromptTemplate({
      organizationId: context.organization.id,
      slug: input.slug,
      name: input.name,
      templateBody: input.templateBody,
      category: input.category,
      createdBy: context.membership.user_id,
    });
    if (!row) return { success: false, message: "Failed to save prompt." };
    revalidateAi();
    return { success: true, message: "Prompt saved.", id: row.id };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}

export async function createWorkflowAction(input: {
  slug: string;
  name: string;
  description?: string;
  agentSlugs: string[];
}): Promise<AiActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const row = await upsertWorkflow({
      organizationId: context.organization.id,
      slug: input.slug,
      name: input.name,
      description: input.description,
      createdBy: context.membership.user_id,
      definition: {
        steps: input.agentSlugs.map((agentSlug, index) => ({
          agentSlug,
          inputFrom: index === 0 ? "user" : "previous",
        })),
      },
    });
    if (!row) return { success: false, message: "Failed to save workflow." };
    revalidateAi();
    return { success: true, message: "Workflow saved.", id: row.id };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}
