"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { setSalesAgentEnabled } from "@/lib/sales-agent/agent";
import { analyzeDeal } from "@/lib/sales-agent/analysis";
import {
  buildMeetingBrief,
  buildMeetingSummary,
  generateEmailDraft,
} from "@/lib/sales-agent/comms";
import {
  analyzeAndPersistDeals,
  buildDailyBriefing,
  ensureSalesSettings,
  loadDealSignals,
} from "@/lib/sales-agent/engine";
import { computeForecast } from "@/lib/sales-agent/forecast";
import { logSalesEvent } from "@/lib/sales-agent/history";
import type { EmailTemplateType } from "@/lib/sales-agent/constants";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { createClient } from "@/lib/supabase/server";
import { toUserFacingError } from "@/lib/ui/user-facing-error";
import type { Json } from "@/types/supabase";

export type SalesActionResult = {
  success: boolean;
  message: string;
  id?: string;
  ids?: string[];
};

function revalidateSales() {
  for (const path of [
    "/sales",
    "/sales/priorities",
    "/sales/deals",
    "/sales/pipeline",
    "/sales/activities",
    "/sales/meetings",
    "/sales/forecast",
    "/sales/insights",
    "/sales/recommendations",
    "/sales/history",
    "/sales/settings",
  ]) {
    revalidatePath(path);
  }
}

export async function refreshSalesBriefingAction(): Promise<SalesActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    await analyzeAndPersistDeals({
      organizationId: context.organization.id,
      userId: context.membership.user_id,
    });
    await buildDailyBriefing({
      organizationId: context.organization.id,
      userId: context.membership.user_id,
    });
    revalidateSales();
    return { success: true, message: "Daily briefing refreshed." };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}

export async function analyzeSalesDealsAction(
  dealIds?: string[],
): Promise<SalesActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const result = await analyzeAndPersistDeals({
      organizationId: context.organization.id,
      userId: context.membership.user_id,
      dealIds,
    });
    revalidateSales();
    return {
      success: true,
      message: `Analyzed ${result.analyzed} deals.`,
    };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}

export async function createFollowUpTaskAction(params: {
  dealId: string;
  title?: string;
}): Promise<SalesActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const supabase = await createClient();
    const { data: deal } = await supabase
      .from("crm_deals")
      .select("id, title, lead_id")
      .eq("organization_id", context.organization.id)
      .eq("id", params.dealId)
      .maybeSingle();
    if (!deal) return { success: false, message: "Deal not found." };

    const signals = await loadDealSignals(context.organization.id);
    const signal = signals.find((s) => s.dealId === deal.id);
    const analysis = signal ? analyzeDeal(signal) : null;

    const { data: task, error } = await supabase
      .from("crm_tasks")
      .insert({
        organization_id: context.organization.id,
        deal_id: deal.id,
        lead_id: deal.lead_id,
        title:
          params.title ??
          `AI follow-up: ${deal.title}${
            analysis ? ` — ${analysis.nextBestAction}` : ""
          }`,
        description: analysis?.coachTips.join("\n") ?? null,
        priority:
          analysis?.riskLevel === "high" || analysis?.riskLevel === "critical"
            ? "high"
            : "normal",
        status: "todo",
        task_type: "follow_up",
        assigned_user_id: context.membership.user_id,
        created_by: context.membership.user_id,
      })
      .select("id")
      .single();

    if (error || !task) {
      return { success: false, message: error?.message ?? "Task failed." };
    }

    await logSalesEvent({
      organizationId: context.organization.id,
      eventType: "task.created",
      summary: `Follow-up task for ${deal.title}`,
      actorUserId: context.membership.user_id,
      dealId: deal.id,
    });

    revalidateSales();
    return { success: true, message: "Follow-up task created.", id: task.id };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}

export async function createEmailDraftAction(params: {
  dealId: string;
  templateType: EmailTemplateType;
}): Promise<SalesActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const supabase = await createClient();
    const { data: deal } = await supabase
      .from("crm_deals")
      .select("id, title, value, lead_id")
      .eq("organization_id", context.organization.id)
      .eq("id", params.dealId)
      .maybeSingle();
    if (!deal) return { success: false, message: "Deal not found." };

    const draft = generateEmailDraft({
      type: params.templateType,
      dealTitle: deal.title,
      value: Number(deal.value ?? 0),
    });

    const settings = await ensureSalesSettings(context.organization.id);
    const { data, error } = await supabase
      .from("sales_agent_email_drafts")
      .insert({
        organization_id: context.organization.id,
        deal_id: deal.id,
        lead_id: deal.lead_id,
        template_type: params.templateType,
        subject: draft.subject,
        body_text: draft.body,
        status: "draft",
        provider: settings.provider,
        model: settings.model,
        created_by: context.membership.user_id,
      })
      .select("id")
      .single();

    if (error || !data) {
      return { success: false, message: error?.message ?? "Draft failed." };
    }

    await logSalesEvent({
      organizationId: context.organization.id,
      eventType: "email.drafted",
      summary: `Drafted ${params.templateType} for ${deal.title}`,
      actorUserId: context.membership.user_id,
      dealId: deal.id,
      provider: settings.provider,
      model: settings.model,
    });

    revalidateSales();
    return { success: true, message: "Email draft created.", id: data.id };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}

export async function createMeetingBriefAction(params: {
  dealId: string;
  title?: string;
  meetingAt?: string | null;
}): Promise<SalesActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const signals = await loadDealSignals(context.organization.id);
    const signal = signals.find((s) => s.dealId === params.dealId);
    if (!signal) return { success: false, message: "Deal not found." };
    const analysis = analyzeDeal(signal);

    const supabase = await createClient();
    const { data: notes } = await supabase
      .from("crm_notes")
      .select("body_text")
      .eq("organization_id", context.organization.id)
      .eq("deal_id", params.dealId)
      .order("created_at", { ascending: false })
      .limit(5);

    const brief = buildMeetingBrief({
      deal: signal,
      analysis,
      notes: (notes ?? []).map((n) => n.body_text).filter(Boolean),
    });

    const { data, error } = await supabase
      .from("sales_agent_meeting_briefs")
      .insert({
        organization_id: context.organization.id,
        deal_id: params.dealId,
        title: params.title ?? `Meeting brief — ${signal.title}`,
        meeting_at: params.meetingAt ?? null,
        brief_json: brief as Json,
        status: "briefed",
        created_by: context.membership.user_id,
      })
      .select("id")
      .single();

    if (error || !data) {
      return { success: false, message: error?.message ?? "Brief failed." };
    }

    await logSalesEvent({
      organizationId: context.organization.id,
      eventType: "meeting.briefed",
      summary: `Meeting brief for ${signal.title}`,
      actorUserId: context.membership.user_id,
      dealId: params.dealId,
    });

    revalidateSales();
    return { success: true, message: "Meeting brief created.", id: data.id };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}

export async function completeMeetingSummaryAction(params: {
  meetingBriefId: string;
  notes: string;
  createTasks?: boolean;
}): Promise<SalesActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const supabase = await createClient();
    const { data: meeting } = await supabase
      .from("sales_agent_meeting_briefs")
      .select("*")
      .eq("organization_id", context.organization.id)
      .eq("id", params.meetingBriefId)
      .maybeSingle();
    if (!meeting?.deal_id) {
      return { success: false, message: "Meeting brief not found." };
    }

    const signals = await loadDealSignals(context.organization.id);
    const signal = signals.find((s) => s.dealId === meeting.deal_id);
    if (!signal) return { success: false, message: "Deal missing." };
    const analysis = analyzeDeal(signal);
    const summary = buildMeetingSummary({
      dealTitle: signal.title,
      notes: params.notes,
      analysis,
    });

    await supabase
      .from("sales_agent_meeting_briefs")
      .update({
        summary_json: summary as Json,
        status: "completed",
      })
      .eq("id", meeting.id);

    await supabase.from("crm_notes").insert({
      organization_id: context.organization.id,
      deal_id: meeting.deal_id,
      body_text: params.notes,
      body_html: `<p>${params.notes.replace(/\n/g, "<br/>")}</p>`,
      created_by: context.membership.user_id,
    });

    if (params.createTasks !== false) {
      await supabase.from("crm_tasks").insert({
        organization_id: context.organization.id,
        deal_id: meeting.deal_id,
        title: `Post-meeting: ${analysis.nextBestAction} — ${signal.title}`,
        description: analysis.coachTips.join("\n"),
        priority:
          analysis.riskLevel === "critical" || analysis.riskLevel === "high"
            ? "high"
            : "normal",
        status: "todo",
        task_type: "follow_up",
        assigned_user_id: context.membership.user_id,
        created_by: context.membership.user_id,
      });
    }

    await supabase
      .from("crm_deals")
      .update({
        probability: Math.round(analysis.closingProbability * 100),
        expected_close_date: analysis.predictedCloseDate,
      })
      .eq("id", meeting.deal_id)
      .eq("organization_id", context.organization.id);

    await logSalesEvent({
      organizationId: context.organization.id,
      eventType: "meeting.summarized",
      summary: `Meeting summary for ${signal.title}`,
      actorUserId: context.membership.user_id,
      dealId: meeting.deal_id,
    });

    revalidateSales();
    return { success: true, message: "Meeting summarized + CRM updated." };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}

export async function saveForecastSnapshotAction(): Promise<SalesActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const settings = await ensureSalesSettings(context.organization.id);
    const signals = await loadDealSignals(context.organization.id);
    const forecast = computeForecast(
      signals,
      Number(settings.forecast_sensitivity) || 0.55,
    );
    const now = new Date();
    const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const supabase = await createClient();

    const inserts = [
      {
        period_type: "month",
        period_key: monthKey,
        forecast_revenue: forecast.month,
      },
      {
        period_type: "quarter",
        period_key: `${now.getUTCFullYear()}-Q${Math.floor(now.getUTCMonth() / 3) + 1}`,
        forecast_revenue: forecast.quarter,
      },
      {
        period_type: "year",
        period_key: String(now.getUTCFullYear()),
        forecast_revenue: forecast.year,
      },
    ];

    for (const row of inserts) {
      await supabase.from("sales_agent_forecast_snapshots").insert({
        organization_id: context.organization.id,
        period_type: row.period_type,
        period_key: row.period_key,
        forecast_revenue: row.forecast_revenue,
        pipeline_revenue: forecast.pipelineRevenue,
        weighted_revenue: forecast.weightedRevenue,
        target_hit_probability: forecast.targetHitProbability,
        confidence: forecast.confidence,
        breakdown_json: forecast as unknown as Json,
        created_by: context.membership.user_id,
      });
    }

    await logSalesEvent({
      organizationId: context.organization.id,
      eventType: "forecast.saved",
      summary: `Forecast snapshot month €${forecast.month}`,
      actorUserId: context.membership.user_id,
    });

    revalidateSales();
    return { success: true, message: "Forecast snapshots saved." };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}

export async function bulkCreateFollowUpsAction(
  dealIds: string[],
): Promise<SalesActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const ids = dealIds.slice(0, 40);
    const supabase = await createClient();
    const { data: job } = await supabase
      .from("sales_agent_bulk_jobs")
      .insert({
        organization_id: context.organization.id,
        job_type: "follow_up",
        status: "running",
        total_count: ids.length,
        input_json: { dealIds: ids } as Json,
        created_by: context.membership.user_id,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    let successCount = 0;
    let failureCount = 0;
    for (const id of ids) {
      const r = await createFollowUpTaskAction({ dealId: id });
      if (r.success) successCount += 1;
      else failureCount += 1;
    }

    if (job?.id) {
      await supabase
        .from("sales_agent_bulk_jobs")
        .update({
          status: "completed",
          success_count: successCount,
          failure_count: failureCount,
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);
    }

    revalidateSales();
    return {
      success: true,
      message: `Bulk follow-ups: ${successCount} ok, ${failureCount} failed.`,
      id: job?.id,
    };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}

export async function bulkAnalyzeDealsAction(
  dealIds: string[],
): Promise<SalesActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const result = await analyzeAndPersistDeals({
      organizationId: context.organization.id,
      userId: context.membership.user_id,
      dealIds: dealIds.slice(0, 50),
    });
    revalidateSales();
    return {
      success: true,
      message: `Bulk analysis completed (${result.analyzed}).`,
    };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}

export async function bulkAssignDealsAction(params: {
  dealIds: string[];
  ownerUserId: string;
}): Promise<SalesActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (
      context.membership.role !== "owner" &&
      context.membership.role !== "admin"
    ) {
      return { success: false, message: "Only admins can bulk assign." };
    }
    const supabase = await createClient();
    const { error } = await supabase
      .from("crm_deals")
      .update({ owner_user_id: params.ownerUserId })
      .eq("organization_id", context.organization.id)
      .in("id", params.dealIds.slice(0, 50));
    if (error) return { success: false, message: error.message };
    revalidateSales();
    return { success: true, message: "Deals assigned." };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}

export async function bulkUpdateStageAction(params: {
  dealIds: string[];
  stageId: string;
}): Promise<SalesActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const supabase = await createClient();
    const { error } = await supabase
      .from("crm_deals")
      .update({
        stage_id: params.stageId,
        last_stage_changed_at: new Date().toISOString(),
      })
      .eq("organization_id", context.organization.id)
      .in("id", params.dealIds.slice(0, 50));
    if (error) return { success: false, message: error.message };
    revalidateSales();
    return { success: true, message: "Stages updated." };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}

const settingsSchema = z.object({
  enabled: z.boolean(),
  approval_mode: z.string(),
  provider: z.string(),
  model: z.string().min(1).max(120),
  forecast_sensitivity: z.number().min(0).max(1),
  risk_threshold: z.number().int().min(0).max(100),
  reminder_frequency_hours: z.number().int().min(1).max(168),
  working_hours_start: z.number().int().min(0).max(23),
  working_hours_end: z.number().int().min(1).max(24),
  timezone: z.string().min(1).max(80),
  rate_limit_per_minute: z.number().int().min(1).max(500),
});

export async function updateSalesSettingsAction(
  input: z.infer<typeof settingsSchema>,
): Promise<SalesActionResult> {
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

    const supabase = await createClient();
    await supabase.from("sales_agent_org_settings").upsert({
      organization_id: context.organization.id,
      ...parsed.data,
    });
    await setSalesAgentEnabled(context.organization.id, parsed.data.enabled);
    revalidateSales();
    return { success: true, message: "Settings updated." };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}
