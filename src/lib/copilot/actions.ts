"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  COPILOT_ACTION_TYPES,
  COPILOT_MUTATING_ACTIONS,
  type CopilotActionType,
} from "@/lib/copilot/constants";
import { runCopilotTurn } from "@/lib/copilot/engine";
import {
  appendCopilotMessages,
  createCopilotConversation,
  getCopilotConversation,
  listCopilotMessages,
} from "@/lib/copilot/queries";
import type { CopilotConversationContext } from "@/lib/copilot/types";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { createClient } from "@/lib/supabase/server";
import { toUserFacingError } from "@/lib/ui/user-facing-error";
import type { Json } from "@/types/supabase";

export type CopilotActionResult = {
  success: boolean;
  message: string;
  conversationId?: string;
  reply?: string;
  intent?: string;
  hits?: unknown[];
  insights?: unknown[];
  recommendations?: unknown[];
  actionProposals?: unknown[];
  actionRunId?: string;
};

export async function sendCopilotMessageAction(input: {
  message: string;
  conversationId?: string | null;
  mode?: string;
}): Promise<CopilotActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };

    const message = input.message.trim();
    if (!message) return { success: false, message: "Message is required." };

    let conversationId = input.conversationId ?? null;
    if (!conversationId) {
      conversationId = await createCopilotConversation({
        organizationId: context.organization.id,
        userId: context.membership.user_id,
        title: message.slice(0, 80),
        mode: input.mode,
      });
    }

    const existing = await getCopilotConversation(
      context.organization.id,
      context.membership.user_id,
      conversationId,
    );
    if (!existing) {
      return { success: false, message: "Conversation not found." };
    }

    const priorContext = (existing.context_json ??
      {}) as CopilotConversationContext;
    const history = await listCopilotMessages(
      context.organization.id,
      conversationId,
      20,
    );

    const turn = await runCopilotTurn({
      organizationId: context.organization.id,
      message,
      priorContext,
      history: history.map((m) => ({ role: m.role, content: m.content })),
    });

    try {
      await appendCopilotMessages({
        organizationId: context.organization.id,
        conversationId,
        userContent: message,
        assistant: {
          content: turn.reply,
          intent: turn.intent,
          payload: {
            hits: turn.hits,
            insights: turn.insights,
            recommendations: turn.recommendations,
          },
          actionProposals: turn.actionProposals,
          providerCode: turn.providerCode,
          model: turn.model,
          latencyMs: turn.latencyMs,
        },
        context: turn.contextPatch,
        title: existing.title === "New conversation" ? message.slice(0, 80) : undefined,
      });
    } catch {
      // Persistence optional until migration applied
    }

    revalidatePath("/copilot");
    return {
      success: true,
      message: "ok",
      conversationId,
      reply: turn.reply,
      intent: turn.intent,
      hits: turn.hits,
      insights: turn.insights,
      recommendations: turn.recommendations,
      actionProposals: turn.actionProposals,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Copilot could not process that message."),
    };
  }
}

export async function toggleCopilotConversationFlagsAction(input: {
  conversationId: string;
  pinned?: boolean;
  favorite?: boolean;
}): Promise<CopilotActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const supabase = await createClient();
    const patch: {
      is_pinned?: boolean;
      is_favorite?: boolean;
    } = {};
    if (input.pinned != null) patch.is_pinned = input.pinned;
    if (input.favorite != null) patch.is_favorite = input.favorite;
    const { error } = await supabase
      .from("copilot_conversations")
      .update(patch)
      .eq("organization_id", context.organization.id)
      .eq("user_id", context.membership.user_id)
      .eq("id", input.conversationId);
    if (error) throw new Error(error.message);
    revalidatePath("/copilot");
    return { success: true, message: "Updated." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not update conversation."),
    };
  }
}

const confirmSchema = z.object({
  actionType: z.enum(COPILOT_ACTION_TYPES),
  preview: z.record(z.string(), z.unknown()).optional(),
  conversationId: z.string().uuid().optional(),
  proposalId: z.string().optional(),
  confirmed: z.literal(true),
});

/**
 * Execute a proposed Copilot action — ONLY when confirmed === true.
 * Phase 25H records the audit row and returns a safe handoff;
 * deep CRM mutations reuse existing module UIs/actions.
 */
export async function confirmCopilotActionAction(
  raw: unknown,
): Promise<CopilotActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };

    const parsed = confirmSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        message:
          "Confirmation required. Mutating Copilot actions will not run without confirmed: true.",
      };
    }

    const actionType = parsed.data.actionType as CopilotActionType;
    if (!COPILOT_MUTATING_ACTIONS.has(actionType) && actionType !== "generate_email") {
      return { success: false, message: "Unknown or unsupported action." };
    }

    const supabase = await createClient();
    let actionRunId: string | undefined;
    try {
      const { data, error } = await supabase
        .from("copilot_action_runs")
        .insert({
          organization_id: context.organization.id,
          conversation_id: parsed.data.conversationId ?? null,
          user_id: context.membership.user_id,
          action_type: actionType,
          status: "confirmed",
          preview_json: (parsed.data.preview ?? {}) as Json,
          confirmed_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (!error) actionRunId = data.id;
    } catch {
      /* migration may be pending */
    }

    // Handoff map — do not silently mutate CRM here
    const handoff: Record<CopilotActionType, string> = {
      create_company: "/companies",
      create_contact: "/crm/contacts",
      create_deal: "/crm/deals",
      create_task: "/crm/tasks",
      move_deal: "/crm/pipeline",
      assign_user: "/crm/leads",
      start_campaign: "/email/campaigns/new",
      generate_email: "/email/ai/reply",
      create_automation: "/crm/automations/new",
      export_data: "/exports",
      delete_record: "/crm",
      refresh_lead_score: "/crm/scoring",
      analyze_website: "/enrichment",
      export_to_hubspot: "/integrations/hubspot",
      create_calendar_event: "/integrations/google_workspace",
      upload_to_drive: "/integrations/google_drive",
      notify_slack: "/integrations/slack",
    };

    if (actionRunId) {
      await supabase
        .from("copilot_action_runs")
        .update({
          status: "executed",
          executed_at: new Date().toISOString(),
          result_json: { handoff: handoff[actionType] } as Json,
        })
        .eq("id", actionRunId)
        .eq("organization_id", context.organization.id);
    }

    return {
      success: true,
      message: `Confirmed. Continue in ${handoff[actionType]} to complete “${actionType}”.`,
      actionRunId,
      reply: handoff[actionType],
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not confirm action."),
    };
  }
}
