"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { revalidatePath } from "next/cache";

import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { toUserFacingError } from "@/lib/ui/user-facing-error";
import {
  createManualSuppression,
  recalculateAndPersistEffectiveStatus,
} from "@/lib/email/preferences";
import { MANDATORY_SUPPRESSION_REASONS } from "@/lib/email/preferences/constants";
import { createServiceClient } from "@/lib/supabase/admin";
import { normalizeSuppressionEmail } from "@/lib/email/suppression";

export type AdminPreferenceActionResult = {
  success: boolean;
  message: string;
};

function canManageSuppressions(role: string): boolean {
  return role === "owner" || role === "admin";
}

export async function createManualSuppressionAction(
  formData: FormData,
): Promise<AdminPreferenceActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "No active organization." };
  if (!canManageSuppressions(context.membership.role)) {
    return { success: false, message: "Only owners/admins can create suppressions." };
  }

  const email = String(formData.get("email") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const expiresAt = String(formData.get("expires_at") ?? "").trim() || null;
  const scope = String(formData.get("scope") ?? "organization").trim();

  if (!email || !reason) {
    return { success: false, message: "Email and reason are required." };
  }

  try {
    const result = await createManualSuppression({
      organizationId: context.organization.id,
      email,
      reason,
      scope,
      notes,
      expiresAt,
      createdBy: context.membership.user_id,
      permanentFlag: !expiresAt,
    });

    if (!result.upserted && result.blockedByStronger) {
      return {
        success: false,
        message: "A stronger mandatory suppression already exists for this email.",
      };
    }

    revalidatePath("/email/suppression");
    revalidatePath("/email/preferences");
    return { success: true, message: "Suppression created." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not create suppression."),
    };
  }
}

export async function removeEligibleSuppressionAction(
  formData: FormData,
): Promise<AdminPreferenceActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "No active organization." };
  if (!canManageSuppressions(context.membership.role)) {
    return { success: false, message: "Only owners/admins can remove suppressions." };
  }

  const suppressionId = String(formData.get("suppression_id") ?? "").trim();
  const removalReason =
    String(formData.get("removal_reason") ?? "").trim() || "admin_removed";
  if (!suppressionId) {
    return { success: false, message: "Suppression id required." };
  }

  const supabase = createServiceClient() as any; // tables not yet in generated Database types
  const { data: row } = await supabase
    .from("email_suppressions")
    .select("*")
    .eq("organization_id", context.organization.id)
    .eq("id", suppressionId)
    .maybeSingle();

  if (!row) return { success: false, message: "Suppression not found." };

  if (MANDATORY_SUPPRESSION_REASONS.has(row.reason)) {
    return {
      success: false,
      message:
        "Complaint, hard-bounce, legal and do-not-contact suppressions cannot be removed casually.",
    };
  }

  await supabase
    .from("email_suppressions")
    .update({
      active: false,
      removed_by: context.membership.user_id,
      removed_at: new Date().toISOString(),
      removal_reason: removalReason,
    })
    .eq("id", suppressionId);

  await supabase.from("email_suppression_history").insert({
    organization_id: context.organization.id,
    suppression_id: suppressionId,
    email_normalized: row.email_normalized,
    action: "deactivated",
    status: row.status,
    reason: row.reason,
    source: "admin_action",
    scope: row.scope,
    permanent_flag: row.permanent_flag,
    notes: removalReason,
    actor_user_id: context.membership.user_id,
  });

  await recalculateAndPersistEffectiveStatus({
    organizationId: context.organization.id,
    emailNormalized: row.email_normalized,
  });

  revalidatePath("/email/suppression");
  revalidatePath("/email/preferences");
  return { success: true, message: "Suppression deactivated." };
}

export async function bulkPausePreferencesAction(
  formData: FormData,
): Promise<AdminPreferenceActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "No active organization." };
  if (!canManageSuppressions(context.membership.role)) {
    return { success: false, message: "Only owners/admins can bulk pause." };
  }

  const emailsRaw = String(formData.get("emails") ?? "");
  const days = Number(formData.get("days") ?? 30);
  const emails = emailsRaw
    .split(/[\n,;]+/)
    .map((e) => normalizeSuppressionEmail(e))
    .filter(Boolean);

  if (emails.length === 0) {
    return { success: false, message: "Provide at least one email." };
  }

  const { processPreferenceUpdate } = await import(
    "@/lib/email/preferences/service"
  );

  let ok = 0;
  let failed = 0;
  for (const email of emails) {
    try {
      await processPreferenceUpdate({
        organizationId: context.organization.id,
        emailNormalized: email,
        pauseDays: Number.isFinite(days) ? days : 30,
        source: "admin_action",
        idempotencyKey: `bulk-pause:${context.organization.id}:${email}:${days}`,
      });
      ok += 1;
    } catch {
      failed += 1;
    }
  }

  revalidatePath("/email/preferences");
  return {
    success: failed === 0,
    message: `Paused ${ok} recipient(s)${failed ? `, ${failed} failed` : ""}.`,
  };
}
