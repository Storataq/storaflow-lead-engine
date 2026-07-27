"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  AUTOMATION_STATUSES,
  AUTOMATION_TRIGGERS,
} from "@/lib/crm/automation/constants";
import {
  emptyAutomationGraph,
  parseAutomationGraph,
} from "@/lib/crm/automation/graph";
import { executeAutomationRun } from "@/lib/crm/automation/executor";
import { processPendingAutomationEvents } from "@/lib/crm/automation/processor";
import { SYSTEM_AUTOMATION_TEMPLATES } from "@/lib/crm/automation/templates";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { createClient } from "@/lib/supabase/server";
import { toUserFacingError } from "@/lib/ui/user-facing-error";
import type { Json } from "@/types/supabase";

export type AutomationActionResult = {
  success: boolean;
  message: string;
  id?: string;
  runId?: string;
};

function canManage(role: string) {
  return role === "owner" || role === "admin";
}

function revalidateAutomations(id?: string) {
  revalidatePath("/crm/automations");
  revalidatePath("/crm");
  if (id) {
    revalidatePath(`/crm/automations/${id}`);
    revalidatePath(`/crm/automations/${id}/edit`);
  }
}

const upsertSchema = z.object({
  automationId: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  triggerType: z.enum(AUTOMATION_TRIGGERS),
  status: z.enum(AUTOMATION_STATUSES).optional(),
  enabled: z.coerce.boolean().optional(),
  graphJson: z.string().min(2).max(500_000).optional(),
  templateCode: z.string().max(64).optional(),
});

export async function upsertAutomationAction(
  formData: FormData,
): Promise<AutomationActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManage(context.membership.role)) {
      return {
        success: false,
        message: "Only owners/admins can manage automations.",
      };
    }

    const parsed = upsertSchema.safeParse({
      automationId: formData.get("automationId") || undefined,
      name: formData.get("name") || "Untitled automation",
      description: formData.get("description") || undefined,
      triggerType: formData.get("triggerType") || "lead_score_changed",
      status: formData.get("status") || undefined,
      enabled:
        formData.get("enabled") === "on" ||
        formData.get("enabled") === "true" ||
        undefined,
      graphJson: formData.get("graphJson") || undefined,
      templateCode: formData.get("templateCode") || undefined,
    });
    if (!parsed.success) {
      return { success: false, message: "Invalid automation payload." };
    }

    let graph = emptyAutomationGraph();
    if (parsed.data.graphJson) {
      try {
        graph = parseAutomationGraph(JSON.parse(parsed.data.graphJson));
      } catch {
        return { success: false, message: "Invalid workflow JSON." };
      }
    } else if (parsed.data.templateCode) {
      const tpl = SYSTEM_AUTOMATION_TEMPLATES.find(
        (t) => t.code === parsed.data.templateCode,
      );
      if (tpl) graph = tpl.graph;
    }

    const supabase = await createClient();
    const payload = {
      organization_id: context.organization.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      trigger_type: parsed.data.triggerType,
      status: parsed.data.status ?? "draft",
      enabled: parsed.data.enabled ?? false,
      workflow_graph_json: graph as unknown as Json,
      definition_json: {
        templateCode: parsed.data.templateCode ?? null,
      } as Json,
      template_code: parsed.data.templateCode ?? null,
      owner_user_id: context.membership.user_id,
      created_by: context.membership.user_id,
      updated_at: new Date().toISOString(),
    };

    if (parsed.data.automationId) {
      const { error } = await supabase
        .from("crm_automations")
        .update(payload)
        .eq("id", parsed.data.automationId)
        .eq("organization_id", context.organization.id);
      if (error) throw new Error(error.message);

      const { data: auto } = await supabase
        .from("crm_automations")
        .select("current_version, name")
        .eq("id", parsed.data.automationId)
        .maybeSingle();

      const nextVersion = (auto?.current_version ?? 1) + 1;
      await supabase.from("crm_automation_versions").insert({
        organization_id: context.organization.id,
        automation_id: parsed.data.automationId,
        version_number: nextVersion,
        status: "draft",
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        trigger_type: parsed.data.triggerType,
        workflow_graph_json: graph as unknown as Json,
        definition_json: payload.definition_json,
        is_current: true,
        created_by: context.membership.user_id,
      });
      await supabase
        .from("crm_automations")
        .update({ current_version: nextVersion })
        .eq("id", parsed.data.automationId);

      revalidateAutomations(parsed.data.automationId);
      return {
        success: true,
        message: "Automation updated.",
        id: parsed.data.automationId,
      };
    }

    const { data, error } = await supabase
      .from("crm_automations")
      .insert(payload)
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Insert failed");

    await supabase.from("crm_automation_versions").insert({
      organization_id: context.organization.id,
      automation_id: data.id,
      version_number: 1,
      status: "draft",
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      trigger_type: parsed.data.triggerType,
      workflow_graph_json: graph as unknown as Json,
      definition_json: payload.definition_json,
      is_current: true,
      created_by: context.membership.user_id,
    });

    revalidateAutomations(data.id);
    return { success: true, message: "Automation created.", id: data.id };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not save automation."),
    };
  }
}

export async function setAutomationEnabledAction(
  automationId: string,
  enabled: boolean,
): Promise<AutomationActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManage(context.membership.role)) {
      return { success: false, message: "Not allowed." };
    }
    const supabase = await createClient();
    const { error } = await supabase
      .from("crm_automations")
      .update({
        enabled,
        status: enabled ? "active" : "paused",
        updated_at: new Date().toISOString(),
      })
      .eq("id", automationId)
      .eq("organization_id", context.organization.id);
    if (error) throw new Error(error.message);
    revalidateAutomations(automationId);
    return {
      success: true,
      message: enabled ? "Automation enabled." : "Automation paused.",
      id: automationId,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not update automation."),
    };
  }
}

export async function deleteAutomationAction(
  automationId: string,
): Promise<AutomationActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManage(context.membership.role)) {
      return { success: false, message: "Not allowed." };
    }
    const supabase = await createClient();
    const { error } = await supabase
      .from("crm_automations")
      .update({
        status: "archived",
        enabled: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", automationId)
      .eq("organization_id", context.organization.id);
    if (error) throw new Error(error.message);
    revalidateAutomations(automationId);
    return { success: true, message: "Automation archived.", id: automationId };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not archive automation."),
    };
  }
}

export async function saveAutomationWorkflowAction(
  formData: FormData,
): Promise<AutomationActionResult> {
  const fd = new FormData();
  fd.set("automationId", String(formData.get("automationId") ?? ""));
  fd.set("name", String(formData.get("name") ?? "Automation"));
  fd.set("triggerType", String(formData.get("triggerType") ?? "lead_score_changed"));
  fd.set("graphJson", String(formData.get("graphJson") ?? "{}"));
  if (formData.get("description")) {
    fd.set("description", String(formData.get("description")));
  }
  if (formData.get("status")) fd.set("status", String(formData.get("status")));
  if (formData.get("enabled")) fd.set("enabled", String(formData.get("enabled")));
  return upsertAutomationAction(fd);
}

export async function runAutomationNowAction(
  automationId: string,
): Promise<AutomationActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManage(context.membership.role)) {
      return { success: false, message: "Not allowed." };
    }

    const supabase = await createClient();
    const { data: automation, error } = await supabase
      .from("crm_automations")
      .select("*")
      .eq("organization_id", context.organization.id)
      .eq("id", automationId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!automation) return { success: false, message: "Automation not found." };

    const idempotencyKey = `manual:${automationId}:${Date.now()}`;
    const { data: run, error: runErr } = await supabase
      .from("crm_automation_runs")
      .insert({
        organization_id: context.organization.id,
        automation_id: automationId,
        status: "pending",
        trigger_type: automation.trigger_type,
        context_json: {
          trigger_type: automation.trigger_type,
          source: "manual",
        } as Json,
        idempotency_key: idempotencyKey,
      })
      .select("id")
      .single();
    if (runErr || !run) throw new Error(runErr?.message ?? "Run create failed");

    const graph = parseAutomationGraph(automation.workflow_graph_json);
    const result = await executeAutomationRun(supabase, {
      organizationId: context.organization.id,
      runId: run.id,
      graph,
      context: {
        trigger_type: automation.trigger_type,
        source: "manual",
        lead_score: 75,
      },
    });

    revalidateAutomations(automationId);
    revalidatePath(`/crm/automations/runs/${run.id}`);
    return {
      success: result.status === "completed",
      message:
        result.status === "completed"
          ? "Manual run completed."
          : result.errorMessage ?? "Run failed.",
      id: automationId,
      runId: run.id,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not run automation."),
    };
  }
}

export async function processAutomationQueueAction(): Promise<AutomationActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManage(context.membership.role)) {
      return { success: false, message: "Not allowed." };
    }
    const supabase = await createClient();
    const result = await processPendingAutomationEvents(
      supabase,
      context.organization.id,
      25,
    );
    revalidateAutomations();
    return {
      success: true,
      message: `Processed ${result.processed} events → ${result.runs} runs.`,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not process automation queue."),
    };
  }
}

export async function createAutomationFromTemplateAction(
  templateCode: string,
): Promise<AutomationActionResult> {
  const tpl = SYSTEM_AUTOMATION_TEMPLATES.find((t) => t.code === templateCode);
  if (!tpl) return { success: false, message: "Template not found." };
  const fd = new FormData();
  fd.set("name", tpl.name);
  fd.set("description", tpl.description);
  fd.set("triggerType", tpl.triggerType);
  fd.set("templateCode", tpl.code);
  fd.set("graphJson", JSON.stringify(tpl.graph));
  fd.set("status", "draft");
  fd.set("enabled", "false");
  return upsertAutomationAction(fd);
}
