"use server";

import { revalidatePath } from "next/cache";

import { runFunnelActivation } from "@/lib/crm/funnel-activation/orchestrator";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { createClient } from "@/lib/supabase/server";
import { toUserFacingError } from "@/lib/ui/user-facing-error";
import { logCrmActivity } from "@/lib/crm/activity";
import type { CampaignApprovalStatus } from "@/lib/crm/funnel-activation/types";

export type FunnelActionResult = {
  success: boolean;
  message: string;
  leadId?: string;
  runId?: string;
};

function revalidateFunnelPaths(companyId?: string | null, leadId?: string | null) {
  revalidatePath("/crm/campaign-ready");
  revalidatePath("/crm/funnel-activation");
  revalidatePath("/crm/leads");
  revalidatePath("/crm/tasks");
  revalidatePath("/companies");
  revalidatePath("/activity");
  if (companyId) {
    revalidatePath(`/companies/${companyId}`);
  }
  if (leadId) {
    revalidatePath(`/crm/leads/${leadId}`);
  }
}

export async function activateFunnelForCompanyAction(
  companyId: string,
  options?: { confirmed?: boolean; force?: boolean },
): Promise<FunnelActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  if (!options?.confirmed) {
    return {
      success: false,
      message: "Bevestiging vereist om funnel activation te starten (assisted mode).",
    };
  }

  try {
    const supabase = await createClient();
    const result = await runFunnelActivation(supabase, {
      organizationId: context.organization.id,
      companyId,
      userId: context.membership.user_id,
      triggerSource: "company_detail",
      confirmed: true,
      force: options.force,
    });

    revalidateFunnelPaths(companyId, result.leadId);

    return {
      success: result.success,
      message: result.message,
      leadId: result.leadId ?? undefined,
      runId: result.runId ?? undefined,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon funnel niet activeren."),
    };
  }
}

export async function activateFunnelForLeadAction(
  leadId: string,
  options?: { confirmed?: boolean; force?: boolean },
): Promise<FunnelActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  try {
    const supabase = await createClient();
    const result = await runFunnelActivation(supabase, {
      organizationId: context.organization.id,
      leadId,
      userId: context.membership.user_id,
      triggerSource: "lead_detail",
      confirmed: options?.confirmed ?? true,
      force: options?.force,
    });

    revalidateFunnelPaths(result.companyId, leadId);

    return {
      success: result.success,
      message: result.message,
      leadId: result.leadId ?? undefined,
      runId: result.runId ?? undefined,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon funnel niet activeren voor lead."),
    };
  }
}

export async function retryFunnelActivationAction(
  companyId?: string | null,
  leadId?: string | null,
): Promise<FunnelActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  try {
    const supabase = await createClient();
    const result = await runFunnelActivation(supabase, {
      organizationId: context.organization.id,
      companyId: companyId ?? undefined,
      leadId: leadId ?? undefined,
      userId: context.membership.user_id,
      triggerSource: "retry",
      confirmed: true,
      force: true,
    });
    revalidateFunnelPaths(result.companyId, result.leadId);
    return {
      success: result.success,
      message: result.message,
      leadId: result.leadId ?? undefined,
      runId: result.runId ?? undefined,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon funnel retry niet uitvoeren."),
    };
  }
}

const BULK_MAX = 10;

export async function activateFunnelBulkAction(
  companyIds: string[],
  options?: { confirmed?: boolean },
): Promise<{
  success: boolean;
  message: string;
  activated: number;
  skipped: number;
  failed: number;
}> {
  const context = await getActiveOrganization();
  if (!context) {
    return {
      success: false,
      message: "Geen actieve organisatie.",
      activated: 0,
      skipped: 0,
      failed: 0,
    };
  }
  if (!options?.confirmed) {
    return {
      success: false,
      message: "Bevestiging vereist voor bulk funnel activation.",
      activated: 0,
      skipped: 0,
      failed: 0,
    };
  }

  const ids = [...new Set(companyIds)].slice(0, BULK_MAX);
  const supabase = await createClient();
  let activated = 0;
  let skipped = 0;
  let failed = 0;

  for (const companyId of ids) {
    const result = await runFunnelActivation(supabase, {
      organizationId: context.organization.id,
      companyId,
      userId: context.membership.user_id,
      triggerSource: "bulk",
      confirmed: true,
    });
    if (result.success && result.message.includes("reused")) skipped += 1;
    else if (result.success) activated += 1;
    else failed += 1;
  }

  revalidateFunnelPaths();
  return {
    success: failed === 0,
    message: `Bulk activation: ${activated} activated, ${skipped} reused/skipped, ${failed} failed (max ${BULK_MAX}).`,
    activated,
    skipped,
    failed,
  };
}

export async function updateCampaignApprovalAction(
  leadId: string,
  approvalStatus: CampaignApprovalStatus,
  notes?: string,
): Promise<FunnelActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Geen actieve organisatie." };

  if (approvalStatus === "approved") {
    // Guard: cannot approve suppressed / invalid
  }

  try {
    const supabase = await createClient();
    const orgId = context.organization.id;

    const { data: row } = await supabase
      .from("campaign_readiness")
      .select("*")
      .eq("organization_id", orgId)
      .eq("lead_id", leadId)
      .maybeSingle();

    if (!row) {
      return { success: false, message: "Geen campaign readiness record gevonden." };
    }
    if (row.status === "suppressed" || row.approval_status === "suppressed") {
      return {
        success: false,
        message: "Suppressed leads cannot be approved for campaigns.",
      };
    }
    if (!row.preferred_email && approvalStatus === "approved") {
      return {
        success: false,
        message: "Cannot approve without a preferred email.",
      };
    }

    const { error } = await supabase
      .from("campaign_readiness")
      .update({
        approval_status: approvalStatus,
        reviewed_by: context.membership.user_id,
        reviewed_at: new Date().toISOString(),
        review_notes: notes?.trim() || null,
        status:
          approvalStatus === "approved"
            ? row.status === "needs_approval" || row.status === "ready_with_review"
              ? "ready"
              : row.status
            : approvalStatus === "rejected"
              ? "not_eligible"
              : row.status,
      })
      .eq("organization_id", orgId)
      .eq("lead_id", leadId);

    if (error) {
      return {
        success: false,
        message: toUserFacingError(error, "Kon approval niet opslaan."),
      };
    }

    await logCrmActivity(supabase, {
      organizationId: orgId,
      userId: context.membership.user_id,
      eventType:
        approvalStatus === "approved"
          ? "funnel.lead_approved"
          : approvalStatus === "rejected"
            ? "funnel.lead_rejected"
            : "funnel.campaign_readiness_calculated",
      entityType: "crm_lead",
      entityId: leadId,
      description: `Campaign approval: ${approvalStatus}`,
      metadata: { notes: notes ?? null },
    });

    revalidateFunnelPaths(row.company_id, leadId);
    return {
      success: true,
      message: `Approval updated: ${approvalStatus}`,
      leadId,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Kon approval niet bijwerken."),
    };
  }
}
