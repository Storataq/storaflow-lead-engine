"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { setCustomerSuccessAgentEnabled } from "@/lib/customer-success/agent";
import {
  analyzeAndPersistCustomers,
  ensureCsSettings,
  loadCustomerSignals,
} from "@/lib/customer-success/engine";
import { logCsEvent } from "@/lib/customer-success/history";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { createClient } from "@/lib/supabase/server";
import { toUserFacingError } from "@/lib/ui/user-facing-error";
import type { Json } from "@/types/supabase";

export type CsActionResult = {
  success: boolean;
  message: string;
  id?: string;
};

function revalidateCs() {
  for (const path of [
    "/customer-success",
    "/customer-success/customers",
    "/customer-success/health",
    "/customer-success/plans",
    "/customer-success/renewals",
    "/customer-success/onboarding",
    "/customer-success/churn",
    "/customer-success/upsell",
    "/customer-success/recommendations",
    "/customer-success/history",
    "/customer-success/settings",
  ]) {
    revalidatePath(path);
  }
}

export async function analyzeCustomersAction(
  companyIds?: string[],
): Promise<CsActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const result = await analyzeAndPersistCustomers({
      organizationId: context.organization.id,
      userId: context.membership.user_id,
      companyIds,
    });
    revalidateCs();
    return {
      success: true,
      message: `Analyzed ${result.analyzed} customers.`,
    };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}

export async function createRenewalTasksAction(
  companyId: string,
): Promise<CsActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const supabase = await createClient();

    const { data: company } = await supabase
      .from("companies")
      .select("id, company_name")
      .eq("organization_id", context.organization.id)
      .eq("id", companyId)
      .maybeSingle();
    if (!company) return { success: false, message: "Company not found." };

    const { data: renewal } = await supabase
      .from("customer_success_renewals")
      .select("*")
      .eq("organization_id", context.organization.id)
      .eq("company_id", companyId)
      .order("contract_ends_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const { data: lead } = await supabase
      .from("crm_leads")
      .select("id")
      .eq("organization_id", context.organization.id)
      .eq("company_id", companyId)
      .limit(1)
      .maybeSingle();

    const tasks = Array.isArray(renewal?.tasks_json)
      ? renewal.tasks_json.map(String)
      : [`Renewal check — ${company.company_name}`];

    let created = 0;
    for (const title of tasks.slice(0, 5)) {
      const { error } = await supabase.from("crm_tasks").insert({
        organization_id: context.organization.id,
        lead_id: lead?.id ?? null,
        title: String(title),
        description: "Created by AI Customer Success Agent",
        priority: "high",
        status: "todo",
        task_type: "follow_up",
        assigned_user_id: context.membership.user_id,
        created_by: context.membership.user_id,
      });
      if (!error) created += 1;
    }

    await logCsEvent({
      organizationId: context.organization.id,
      eventType: "renewal.tasks_created",
      summary: `Created ${created} renewal tasks for ${company.company_name}`,
      actorUserId: context.membership.user_id,
      companyId,
    });

    revalidateCs();
    return { success: true, message: `Created ${created} renewal tasks.` };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}

export async function addCsNoteAction(params: {
  companyId: string;
  note: string;
}): Promise<CsActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const note = params.note.trim();
    if (note.length < 3) return { success: false, message: "Note too short." };

    const supabase = await createClient();
    const { data: lead } = await supabase
      .from("crm_leads")
      .select("id")
      .eq("organization_id", context.organization.id)
      .eq("company_id", params.companyId)
      .limit(1)
      .maybeSingle();

    if (!lead) {
      return {
        success: false,
        message: "No CRM lead linked to this company.",
      };
    }

    const { error } = await supabase.from("crm_notes").insert({
      organization_id: context.organization.id,
      lead_id: lead.id,
      body_text: note,
      body_html: `<p>${note.replace(/\n/g, "<br/>")}</p>`,
      created_by: context.membership.user_id,
    });
    if (error) return { success: false, message: error.message };

    await logCsEvent({
      organizationId: context.organization.id,
      eventType: "crm.note_added",
      summary: "CS note added to CRM timeline",
      actorUserId: context.membership.user_id,
      companyId: params.companyId,
    });

    revalidateCs();
    return { success: true, message: "Note added to CRM." };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}

export async function bulkAnalyzeCustomersAction(
  companyIds: string[],
): Promise<CsActionResult> {
  return analyzeCustomersAction(companyIds.slice(0, 50));
}

export async function bulkCreateSuccessPlansAction(
  companyIds: string[],
): Promise<CsActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const supabase = await createClient();
    const ids = companyIds.slice(0, 40);

    const { data: job } = await supabase
      .from("customer_success_bulk_jobs")
      .insert({
        organization_id: context.organization.id,
        job_type: "success_plans",
        status: "running",
        total_count: ids.length,
        input_json: { companyIds: ids } as Json,
        created_by: context.membership.user_id,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    const result = await analyzeAndPersistCustomers({
      organizationId: context.organization.id,
      userId: context.membership.user_id,
      companyIds: ids,
    });

    if (job?.id) {
      await supabase
        .from("customer_success_bulk_jobs")
        .update({
          status: "completed",
          success_count: result.analyzed,
          failure_count: Math.max(0, ids.length - result.analyzed),
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);
    }

    revalidateCs();
    return {
      success: true,
      message: `Bulk success plans/analysis: ${result.analyzed}.`,
      id: job?.id,
    };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}

export async function applyRecommendationAction(
  recommendationId: string,
): Promise<CsActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const supabase = await createClient();
    const { data: rec } = await supabase
      .from("customer_success_recommendations")
      .select("*")
      .eq("organization_id", context.organization.id)
      .eq("id", recommendationId)
      .maybeSingle();
    if (!rec) return { success: false, message: "Recommendation not found." };

    if (rec.company_id) {
      const { data: lead } = await supabase
        .from("crm_leads")
        .select("id")
        .eq("organization_id", context.organization.id)
        .eq("company_id", rec.company_id)
        .limit(1)
        .maybeSingle();

      await supabase.from("crm_tasks").insert({
        organization_id: context.organization.id,
        lead_id: lead?.id ?? null,
        title: rec.title,
        description: rec.rationale,
        priority: rec.priority >= 80 ? "high" : "normal",
        status: "todo",
        task_type: "follow_up",
        assigned_user_id: context.membership.user_id,
        created_by: context.membership.user_id,
      });
    }

    await supabase
      .from("customer_success_recommendations")
      .update({ status: "applied" })
      .eq("id", rec.id);

    revalidateCs();
    return { success: true, message: "Recommendation applied as CRM task." };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}

const settingsSchema = z.object({
  enabled: z.boolean(),
  approval_mode: z.string(),
  provider: z.string(),
  model: z.string().min(1).max(120),
  churn_threshold: z.number().int().min(0).max(100),
  renewal_window_days: z.number().int().min(7).max(365),
  rate_limit_per_minute: z.number().int().min(1).max(500),
});

export async function updateCsSettingsAction(
  input: z.infer<typeof settingsSchema>,
): Promise<CsActionResult> {
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

    await ensureCsSettings(context.organization.id);
    const supabase = await createClient();
    await supabase.from("customer_success_org_settings").upsert({
      organization_id: context.organization.id,
      ...parsed.data,
    });
    await setCustomerSuccessAgentEnabled(
      context.organization.id,
      parsed.data.enabled,
    );
    revalidateCs();
    return { success: true, message: "Settings updated." };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}

/** Prefetch signals helper for diagnostics (optional). */
export async function previewCustomerSignalsAction(): Promise<CsActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const signals = await loadCustomerSignals(context.organization.id, 20);
    return {
      success: true,
      message: `Loaded ${signals.length} customer signals.`,
    };
  } catch (error) {
    return { success: false, message: toUserFacingError(error) };
  }
}
