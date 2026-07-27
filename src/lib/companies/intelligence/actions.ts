"use server";

import { revalidatePath } from "next/cache";

import {
  applyIntelligenceResult,
  markIntelligenceProcessing,
} from "@/lib/companies/intelligence/apply";
import { generateCompanyIntelligence } from "@/lib/companies/intelligence/generate";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { createClient } from "@/lib/supabase/server";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

export type IntelligenceActionResult = {
  success: boolean;
  message: string;
  healthScore?: number;
  leadScore?: number;
  needsReview?: boolean;
};

function canManage(role: string) {
  return role === "owner" || role === "admin";
}

export async function refreshCompanyIntelligenceAction(
  companyId: string,
): Promise<IntelligenceActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Geen actieve organisatie." };
    if (!canManage(context.membership.role)) {
      return {
        success: false,
        message: "Alleen owners of admins mogen AI-analyse vernieuwen.",
      };
    }

    const supabase = await createClient();
    const started = Date.now();

    await markIntelligenceProcessing(
      supabase,
      context.organization.id,
      companyId,
    );

    const { result } = await generateCompanyIntelligence({
      organizationId: context.organization.id,
      companyId,
      supabase,
      useAi: true,
    });

    await applyIntelligenceResult(supabase, {
      organizationId: context.organization.id,
      companyId,
      result,
      source: "manual",
      actorUserId: context.membership.user_id,
      durationMs: Date.now() - started,
    });

    revalidatePath("/companies");
    revalidatePath(`/companies/${companyId}`);

    return {
      success: true,
      message: result.needsReview
        ? "AI-analyse bijgewerkt — review aangeraden."
        : "AI-analyse bijgewerkt.",
      healthScore: result.health.score,
      leadScore: result.leadPotential.score,
      needsReview: result.needsReview,
    };
  } catch (error) {
    try {
      const context = await getActiveOrganization();
      if (context) {
        const supabase = await createClient();
        await supabase
          .from("companies")
          .update({ intelligence_status: "failed" })
          .eq("organization_id", context.organization.id)
          .eq("id", companyId);
      }
    } catch {
      // ignore secondary failure
    }

    return {
      success: false,
      message: toUserFacingError(error, "AI-analyse mislukt."),
    };
  }
}
