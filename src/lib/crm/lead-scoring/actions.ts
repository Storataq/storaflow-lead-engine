"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { applyLeadScoringResult } from "@/lib/crm/lead-scoring/apply";
import { generateLeadScore } from "@/lib/crm/lead-scoring/generate";
import {
  defaultScoringSettings,
  ensureLeadScoringSettings,
} from "@/lib/crm/lead-scoring/settings";
import { SCORING_CATEGORIES } from "@/lib/crm/lead-scoring/constants";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { createClient } from "@/lib/supabase/server";
import { toUserFacingError } from "@/lib/ui/user-facing-error";
import type { Json } from "@/types/supabase";

export type LeadScoringActionResult = {
  success: boolean;
  message: string;
  score?: number;
  classification?: string;
};

function canManage(role: string) {
  return role === "owner" || role === "admin";
}

function revalidateScoring(leadId?: string) {
  revalidatePath("/crm");
  revalidatePath("/crm/leads");
  revalidatePath("/crm/scoring");
  revalidatePath("/crm/pipeline");
  revalidatePath("/crm/deals");
  if (leadId) revalidatePath(`/crm/leads/${leadId}`);
}

export async function recalculateLeadScoreAction(
  leadId: string,
): Promise<LeadScoringActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManage(context.membership.role)) {
      return {
        success: false,
        message: "Only owners/admins can recalculate lead scores.",
      };
    }

    const supabase = await createClient();
    const { result, companyId } = await generateLeadScore({
      organizationId: context.organization.id,
      leadId,
      supabase,
    });

    await applyLeadScoringResult(supabase, {
      organizationId: context.organization.id,
      leadId,
      companyId,
      result,
      source: "manual",
      actorUserId: context.membership.user_id,
      reason: "manual_recalculate",
    });

    revalidateScoring(leadId);
    return {
      success: true,
      message: `Lead scored ${result.overallScore} (${result.classification}).`,
      score: result.overallScore,
      classification: result.classification,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not recalculate lead score."),
    };
  }
}

export async function recalculateLeadScoresBatchAction(
  limit = 25,
): Promise<LeadScoringActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManage(context.membership.role)) {
      return {
        success: false,
        message: "Only owners/admins can batch-score leads.",
      };
    }

    const supabase = await createClient();
    const { data: leads, error } = await supabase
      .from("crm_leads")
      .select("id")
      .eq("organization_id", context.organization.id)
      .neq("status", "archived")
      .order("updated_at", { ascending: false })
      .limit(Math.min(100, Math.max(1, limit)));
    if (error) throw new Error(error.message);

    let ok = 0;
    for (const lead of leads ?? []) {
      try {
        const { result, companyId } = await generateLeadScore({
          organizationId: context.organization.id,
          leadId: lead.id,
          supabase,
        });
        await applyLeadScoringResult(supabase, {
          organizationId: context.organization.id,
          leadId: lead.id,
          companyId,
          result,
          source: "scheduled",
          actorUserId: context.membership.user_id,
          reason: "batch_recalculate",
        });
        ok += 1;
      } catch {
        // continue batch
      }
    }

    revalidateScoring();
    return {
      success: true,
      message: `Recalculated ${ok} of ${(leads ?? []).length} leads.`,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Batch scoring failed."),
    };
  }
}

const settingsSchema = z.object({
  enabled: z.coerce.boolean().optional(),
  veryHotMin: z.coerce.number().min(0).max(100).optional(),
  hotMin: z.coerce.number().min(0).max(100).optional(),
  warmMin: z.coerce.number().min(0).max(100).optional(),
  coldMin: z.coerce.number().min(0).max(100).optional(),
});

export async function updateLeadScoringSettingsAction(
  formData: FormData,
): Promise<LeadScoringActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManage(context.membership.role)) {
      return {
        success: false,
        message: "Only owners/admins can update scoring settings.",
      };
    }

    const parsed = settingsSchema.safeParse({
      enabled: formData.get("enabled") === "on" || formData.get("enabled") === "true",
      veryHotMin: formData.get("veryHotMin") || undefined,
      hotMin: formData.get("hotMin") || undefined,
      warmMin: formData.get("warmMin") || undefined,
      coldMin: formData.get("coldMin") || undefined,
    });
    if (!parsed.success) {
      return { success: false, message: "Invalid settings." };
    }

    const current = await ensureLeadScoringSettings(context.organization.id);
    const weights = { ...current.weights };
    for (const cat of SCORING_CATEGORIES) {
      const raw = formData.get(`weight_${cat}`);
      if (raw != null && String(raw).trim() !== "") {
        const n = Number(raw);
        if (Number.isFinite(n)) weights[cat] = Math.max(0, Math.min(100, n));
      }
    }

    const ranges = {
      very_hotMin:
        parsed.data.veryHotMin ?? current.classificationRanges.very_hotMin,
      hotMin: parsed.data.hotMin ?? current.classificationRanges.hotMin,
      warmMin: parsed.data.warmMin ?? current.classificationRanges.warmMin,
      coldMin: parsed.data.coldMin ?? current.classificationRanges.coldMin,
    };

    const automationTriggers = { ...current.automationTriggers };
    for (const key of Object.keys(automationTriggers)) {
      const v = formData.get(`auto_${key}`);
      if (v != null) automationTriggers[key] = v === "on" || v === "true";
    }

    const supabase = await createClient();
    const { error } = await supabase.from("lead_scoring_settings").upsert({
      organization_id: context.organization.id,
      weights_json: weights as unknown as Json,
      classification_ranges_json: ranges as unknown as Json,
      thresholds_json: current.thresholds as unknown as Json,
      automation_triggers_json: automationTriggers as unknown as Json,
      enabled: parsed.data.enabled ?? current.enabled,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);

    revalidatePath("/crm/scoring");
    revalidatePath("/crm/scoring/settings");
    return { success: true, message: "Scoring settings saved." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not save settings."),
    };
  }
}

export async function acknowledgeScoringAlertAction(
  alertId: string,
): Promise<LeadScoringActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManage(context.membership.role)) {
      return { success: false, message: "Not allowed." };
    }
    const supabase = await createClient();
    const { error } = await supabase
      .from("lead_scoring_alerts")
      .update({ acknowledged_at: new Date().toISOString() })
      .eq("id", alertId)
      .eq("organization_id", context.organization.id);
    if (error) throw new Error(error.message);
    revalidatePath("/crm/scoring");
    return { success: true, message: "Alert acknowledged." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not acknowledge alert."),
    };
  }
}

/** Exported for tests / background hooks */
export async function scoreLeadInternal(
  organizationId: string,
  leadId: string,
  userId?: string | null,
) {
  const supabase = await createClient();
  const settings = await ensureLeadScoringSettings(organizationId);
  if (!settings.enabled) return null;
  const { result, companyId } = await generateLeadScore({
    organizationId,
    leadId,
    supabase,
    settings,
  });
  await applyLeadScoringResult(supabase, {
    organizationId,
    leadId,
    companyId,
    result,
    source: "api",
    actorUserId: userId ?? null,
  });
  return result;
}

export { defaultScoringSettings };
