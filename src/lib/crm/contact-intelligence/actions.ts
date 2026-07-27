"use server";

import { revalidatePath } from "next/cache";

import {
  applyContactIntelligenceResult,
  markContactIntelligenceProcessing,
} from "@/lib/crm/contact-intelligence/apply";
import { generateContactIntelligence } from "@/lib/crm/contact-intelligence/generate";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { createClient } from "@/lib/supabase/server";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

export type ContactIntelligenceActionResult = {
  success: boolean;
  message: string;
  healthScore?: number;
  qualityScore?: number;
  needsReview?: boolean;
};

function canManage(role: string) {
  return role === "owner" || role === "admin";
}

export async function refreshContactIntelligenceAction(
  contactId: string,
): Promise<ContactIntelligenceActionResult> {
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

    const { data: contact, error } = await supabase
      .from("crm_lead_contacts")
      .select("id, lead_id")
      .eq("organization_id", context.organization.id)
      .eq("id", contactId)
      .maybeSingle();

    if (error || !contact) {
      return { success: false, message: "Contact niet gevonden." };
    }

    await markContactIntelligenceProcessing(
      supabase,
      context.organization.id,
      contactId,
    );

    const { result } = await generateContactIntelligence({
      organizationId: context.organization.id,
      contactId,
      supabase,
      useAi: true,
    });

    await applyContactIntelligenceResult(supabase, {
      organizationId: context.organization.id,
      contactId,
      leadId: contact.lead_id,
      result,
      source: "manual",
      actorUserId: context.membership.user_id,
      durationMs: Date.now() - started,
    });

    revalidatePath("/crm/contacts");
    revalidatePath(`/crm/contacts/${contactId}`);
    revalidatePath(`/crm/leads/${contact.lead_id}`);

    return {
      success: true,
      message: result.needsReview
        ? "AI-analyse bijgewerkt — review aangeraden."
        : "AI-analyse bijgewerkt.",
      healthScore: result.health.score,
      qualityScore: result.quality.score,
      needsReview: result.needsReview,
    };
  } catch (error) {
    try {
      const context = await getActiveOrganization();
      if (context) {
        const supabase = await createClient();
        await supabase
          .from("crm_lead_contacts")
          .update({ intelligence_status: "failed" })
          .eq("organization_id", context.organization.id)
          .eq("id", contactId);
      }
    } catch {
      // ignore
    }

    return {
      success: false,
      message: toUserFacingError(error, "AI-analyse mislukt."),
    };
  }
}
