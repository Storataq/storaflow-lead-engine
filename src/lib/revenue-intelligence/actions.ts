"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { setRevenueIntelligenceAgentEnabled } from "@/lib/revenue-intelligence/agent";
import {
  SCENARIO_TYPES,
  type ScenarioType,
} from "@/lib/revenue-intelligence/constants";
import {
  ensureRevenueSettings,
  persistReports,
  persistScenario,
  refreshRevenueIntelligence,
} from "@/lib/revenue-intelligence/engine";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { createClient } from "@/lib/supabase/server";
import { toUserFacingError } from "@/lib/ui/user-facing-error";
import type { Json } from "@/types/supabase";

export type RevenueActionResult = {
  success: boolean;
  message: string;
  id?: string;
};

function revalidateRevenue() {
  for (const path of [
    "/revenue",
    "/revenue/revenue",
    "/revenue/forecast",
    "/revenue/pipeline",
    "/revenue/customers",
    "/revenue/growth",
    "/revenue/mrr",
    "/revenue/arr",
    "/revenue/churn",
    "/revenue/expansion",
    "/revenue/reports",
    "/revenue/insights",
    "/revenue/history",
    "/revenue/settings",
  ]) {
    revalidatePath(path);
  }
}

export async function refreshRevenueAction(): Promise<RevenueActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const stats = await refreshRevenueIntelligence({
      organizationId: context.organization.id,
      userId: context.membership.user_id,
    });
    revalidateRevenue();
    return {
      success: true,
      message: `Refreshed — MRR €${Math.round(stats.kpis.mrr).toLocaleString("nl-NL")}.`,
    };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}

export async function runScenarioAction(
  scenarioType: ScenarioType,
): Promise<RevenueActionResult> {
  try {
    if (!SCENARIO_TYPES.includes(scenarioType)) {
      return { success: false, message: "Invalid scenario." };
    }
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const { id, result } = await persistScenario({
      organizationId: context.organization.id,
      userId: context.membership.user_id,
      scenarioType,
    });
    revalidateRevenue();
    return {
      success: true,
      message: `${result.name}: ΔMRR €${result.deltaMrr}, ΔARR €${result.deltaArr}.`,
      id,
    };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}

export async function generateReportsAction(): Promise<RevenueActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const ids = await persistReports({
      organizationId: context.organization.id,
      userId: context.membership.user_id,
    });
    revalidateRevenue();
    return {
      success: true,
      message: `Generated ${ids.length} reports (PDF/Excel/PPT ready).`,
    };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}

export async function bulkAnalyzeRevenueAction(): Promise<RevenueActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const supabase = await createClient();
    const { data: job } = await supabase
      .from("revenue_intel_bulk_jobs")
      .insert({
        organization_id: context.organization.id,
        job_type: "analyze",
        status: "running",
        total_count: 1,
        input_json: {} as Json,
        created_by: context.membership.user_id,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    await refreshRevenueIntelligence({
      organizationId: context.organization.id,
      userId: context.membership.user_id,
    });

    if (job?.id) {
      await supabase
        .from("revenue_intel_bulk_jobs")
        .update({
          status: "completed",
          success_count: 1,
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);
    }

    revalidateRevenue();
    return { success: true, message: "Bulk analysis completed.", id: job?.id };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}

const settingsSchema = z.object({
  enabled: z.boolean(),
  approval_mode: z.string(),
  provider: z.string(),
  model: z.string().min(1).max(120),
  forecast_horizon_months: z.number().int().min(1).max(60),
  rate_limit_per_minute: z.number().int().min(1).max(500),
});

export async function updateRevenueSettingsAction(
  input: z.infer<typeof settingsSchema>,
): Promise<RevenueActionResult> {
  try {
    const parsed = settingsSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "Invalid settings." };
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (
      context.membership.role !== "owner" &&
      context.membership.role !== "admin"
    ) {
      return { success: false, message: "Only admins can update settings." };
    }

    await ensureRevenueSettings(context.organization.id);
    const supabase = await createClient();
    await supabase.from("revenue_intel_org_settings").upsert({
      organization_id: context.organization.id,
      ...parsed.data,
    });
    await setRevenueIntelligenceAgentEnabled(
      context.organization.id,
      parsed.data.enabled,
    );
    revalidateRevenue();
    return { success: true, message: "Settings updated." };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}
