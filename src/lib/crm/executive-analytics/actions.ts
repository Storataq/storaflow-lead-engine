"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { DEFAULT_EXEC_FILTERS } from "@/lib/crm/executive-analytics/constants";
import type { ExecutiveFilters } from "@/lib/crm/executive-analytics/types";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { createClient } from "@/lib/supabase/server";
import { toUserFacingError } from "@/lib/ui/user-facing-error";
import type { Json } from "@/types/supabase";

export type ExecReportActionResult = {
  success: boolean;
  message: string;
  id?: string;
  csv?: string;
};

function canManage(role: string) {
  return role === "owner" || role === "admin";
}

const filtersSchema = z.object({
  dateRange: z.string(),
  customFrom: z.string().nullable().optional(),
  customTo: z.string().nullable().optional(),
  ownerUserId: z.string().nullable().optional(),
  pipelineId: z.string().nullable().optional(),
  campaignId: z.string().nullable().optional(),
  companyCategory: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  leadClassification: z.string().nullable().optional(),
  leadScoreMin: z.number().nullable().optional(),
  leadScoreMax: z.number().nullable().optional(),
  dealStatus: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
});

export async function saveExecutiveReportAction(input: {
  name: string;
  description?: string;
  filters: Partial<ExecutiveFilters>;
  reportId?: string;
}): Promise<ExecReportActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManage(context.membership.role)) {
      return {
        success: false,
        message: "Only owners/admins can manage reports.",
      };
    }

    const name = input.name.trim();
    if (!name) return { success: false, message: "Report name is required." };

    const parsed = filtersSchema.safeParse({
      ...DEFAULT_EXEC_FILTERS,
      ...input.filters,
    });
    if (!parsed.success) {
      return { success: false, message: "Invalid filter payload." };
    }

    const supabase = await createClient();
    if (input.reportId) {
      const { error } = await supabase
        .from("crm_executive_reports")
        .update({
          name,
          description: input.description ?? null,
          filters_json: parsed.data as Json,
          updated_by: context.membership.user_id,
        })
        .eq("organization_id", context.organization.id)
        .eq("id", input.reportId);
      if (error) throw new Error(error.message);
      revalidatePath("/crm/executive");
      return { success: true, message: "Report updated.", id: input.reportId };
    }

    const { data, error } = await supabase
      .from("crm_executive_reports")
      .insert({
        organization_id: context.organization.id,
        name,
        description: input.description ?? null,
        filters_json: parsed.data as Json,
        created_by: context.membership.user_id,
        updated_by: context.membership.user_id,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    revalidatePath("/crm/executive");
    return { success: true, message: "Report saved.", id: data.id };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not save report."),
    };
  }
}

export async function duplicateExecutiveReportAction(
  reportId: string,
): Promise<ExecReportActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManage(context.membership.role)) {
      return { success: false, message: "Only owners/admins can manage reports." };
    }
    const supabase = await createClient();
    const { data: existing, error } = await supabase
      .from("crm_executive_reports")
      .select("*")
      .eq("organization_id", context.organization.id)
      .eq("id", reportId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!existing) return { success: false, message: "Report not found." };

    const { data, error: insertError } = await supabase
      .from("crm_executive_reports")
      .insert({
        organization_id: context.organization.id,
        name: `${existing.name} (copy)`,
        description: existing.description,
        filters_json: existing.filters_json,
        layout_json: existing.layout_json,
        created_by: context.membership.user_id,
        updated_by: context.membership.user_id,
        is_favorite: false,
        is_default: false,
      })
      .select("id")
      .single();
    if (insertError) throw new Error(insertError.message);
    revalidatePath("/crm/executive");
    return { success: true, message: "Report duplicated.", id: data.id };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not duplicate report."),
    };
  }
}

export async function archiveExecutiveReportAction(
  reportId: string,
): Promise<ExecReportActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManage(context.membership.role)) {
      return { success: false, message: "Only owners/admins can manage reports." };
    }
    const supabase = await createClient();
    const { error } = await supabase
      .from("crm_executive_reports")
      .update({ is_archived: true, is_default: false })
      .eq("organization_id", context.organization.id)
      .eq("id", reportId);
    if (error) throw new Error(error.message);
    revalidatePath("/crm/executive");
    return { success: true, message: "Report archived." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not archive report."),
    };
  }
}

export async function setFavoriteExecutiveReportAction(input: {
  reportId: string;
  favorite: boolean;
}): Promise<ExecReportActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManage(context.membership.role)) {
      return { success: false, message: "Only owners/admins can manage reports." };
    }
    const supabase = await createClient();
    const { error } = await supabase
      .from("crm_executive_reports")
      .update({ is_favorite: input.favorite })
      .eq("organization_id", context.organization.id)
      .eq("id", input.reportId);
    if (error) throw new Error(error.message);
    revalidatePath("/crm/executive");
    return { success: true, message: "Favorite updated." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not update favorite."),
    };
  }
}

export async function setDefaultExecutiveReportAction(
  reportId: string,
): Promise<ExecReportActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManage(context.membership.role)) {
      return { success: false, message: "Only owners/admins can manage reports." };
    }
    const supabase = await createClient();
    await supabase
      .from("crm_executive_reports")
      .update({ is_default: false })
      .eq("organization_id", context.organization.id)
      .eq("is_default", true);
    const { error } = await supabase
      .from("crm_executive_reports")
      .update({ is_default: true })
      .eq("organization_id", context.organization.id)
      .eq("id", reportId);
    if (error) throw new Error(error.message);
    revalidatePath("/crm/executive");
    return { success: true, message: "Default report set." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not set default report."),
    };
  }
}

/** CSV export of KPI + attention snapshot (RBAC checked). */
export async function exportExecutiveAnalyticsCsvAction(csvBody: string): Promise<ExecReportActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!(canManage(context.membership.role) || context.membership.role === "member")) {
      return { success: false, message: "Not permitted to export." };
    }
    return {
      success: true,
      message: "Export ready.",
      csv: csvBody,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not export."),
    };
  }
}
