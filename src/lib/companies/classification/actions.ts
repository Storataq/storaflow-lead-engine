"use server";

import { revalidatePath } from "next/cache";

import { applyClassificationResult } from "@/lib/companies/classification/apply";
import { classifyCompanyCategory } from "@/lib/companies/classification/classify";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { createClient } from "@/lib/supabase/server";
import { toUserFacingError } from "@/lib/ui/user-facing-error";
import type { Json } from "@/types/supabase";

export type ClassificationActionResult = {
  success: boolean;
  message: string;
  applied?: boolean;
  needsReview?: boolean;
  confidence?: number;
};

function canManage(role: string) {
  return role === "owner" || role === "admin";
}

function asJson(value: unknown): Json {
  return value as Json;
}

export async function reclassifyCompanyAction(
  companyId: string,
): Promise<ClassificationActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Geen actieve organisatie." };
    if (!canManage(context.membership.role)) {
      return {
        success: false,
        message: "Alleen owners of admins mogen herclassificeren.",
      };
    }

    const supabase = await createClient();
    const result = await classifyCompanyCategory({
      organizationId: context.organization.id,
      companyId,
      supabase,
      useAi: true,
    });

    const applied = await applyClassificationResult(supabase, {
      organizationId: context.organization.id,
      companyId,
      result,
      source: "manual_reclassify",
      actorUserId: context.membership.user_id,
    });

    revalidatePath("/companies");
    revalidatePath(`/companies/${companyId}`);
    revalidatePath("/dashboard");

    return {
      success: true,
      message: applied.skippedDueToOverride
        ? "Suggestion updated. Manual override preserved."
        : applied.applied
          ? "Category auto-selected from high-confidence classification."
          : "Suggestion stored. Confirmation required.",
      applied: applied.applied,
      needsReview: applied.needsReview,
      confidence: result.confidence,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Reclassify failed."),
    };
  }
}

export async function resetAutomaticClassificationAction(
  companyId: string,
): Promise<ClassificationActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Geen actieve organisatie." };
    if (!canManage(context.membership.role)) {
      return {
        success: false,
        message: "Alleen owners of admins mogen overrides resetten.",
      };
    }

    const supabase = await createClient();
    await supabase
      .from("companies")
      .update({ category_manual_override: false })
      .eq("organization_id", context.organization.id)
      .eq("id", companyId);

    const result = await classifyCompanyCategory({
      organizationId: context.organization.id,
      companyId,
      supabase,
      useAi: true,
    });

    const applied = await applyClassificationResult(supabase, {
      organizationId: context.organization.id,
      companyId,
      result,
      source: "reset_automatic",
      actorUserId: context.membership.user_id,
      resetManualOverride: true,
      force: true,
    });

    revalidatePath("/companies");
    revalidatePath(`/companies/${companyId}`);
    revalidatePath("/dashboard");

    return {
      success: true,
      message: "Automatic classification restored.",
      applied: applied.applied,
      needsReview: applied.needsReview,
      confidence: result.confidence,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Reset failed."),
    };
  }
}

/**
 * After CSV category import: keep imported category, classify for transparency,
 * and warn when AI suggestion differs from the imported value.
 * When no category was imported, run normal classification (may auto-assign).
 */
export async function classifyAfterCsvImportAction(
  companyId: string,
  importedCategoryId: string | null,
): Promise<ClassificationActionResult & { warning?: string }> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Geen actieve organisatie." };
    if (!canManage(context.membership.role)) {
      return {
        success: false,
        message: "Alleen owners of admins mogen CSV-classificatie uitvoeren.",
      };
    }

    const supabase = await createClient();
    const result = await classifyCompanyCategory({
      organizationId: context.organization.id,
      companyId,
      supabase,
      useAi: true,
    });

    if (importedCategoryId) {
      // Imported value wins — store suggestion only (override already set by assign).
      await applyClassificationResult(supabase, {
        organizationId: context.organization.id,
        companyId,
        result,
        source: "csv_import",
        actorUserId: context.membership.user_id,
      });

      await supabase
        .from("companies")
        .update({
          category_classified_by: "imported",
          company_category_id: importedCategoryId,
          category_manual_override: true,
          category_needs_review: false,
        })
        .eq("organization_id", context.organization.id)
        .eq("id", companyId);

      const differs =
        result.suggestedCategoryId != null &&
        result.suggestedCategoryId !== importedCategoryId &&
        result.confidence >= 80;

      revalidatePath("/companies");
      revalidatePath(`/companies/${companyId}`);

      return {
        success: true,
        message: "Imported category kept.",
        warning: differs
          ? `AI suggests "${result.suggestedCategoryName}" (${Math.round(result.confidence)}%) which differs from the imported category. Imported value was kept.`
          : undefined,
        confidence: result.confidence,
        needsReview: false,
        applied: false,
      };
    }

    const applied = await applyClassificationResult(supabase, {
      organizationId: context.organization.id,
      companyId,
      result,
      source: "csv_import",
      actorUserId: context.membership.user_id,
    });

    revalidatePath("/companies");
    revalidatePath(`/companies/${companyId}`);
    revalidatePath("/dashboard");

    return {
      success: true,
      message: applied.applied
        ? "Category auto-selected from classification."
        : "Suggestion stored for review.",
      applied: applied.applied,
      needsReview: applied.needsReview,
      confidence: result.confidence,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "CSV classification failed."),
    };
  }
}

export async function bulkClassifyCompaniesAction(
  companyIds: string[],
): Promise<ClassificationActionResult & { processed?: number; total?: number }> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Geen actieve organisatie." };
    if (!canManage(context.membership.role)) {
      return {
        success: false,
        message: "Alleen owners of admins mogen bulk classificeren.",
      };
    }

    const ids = companyIds.filter(Boolean);
    if (ids.length === 0) {
      return { success: false, message: "Selecteer minstens één bedrijf." };
    }

    const supabase = await createClient();
    let appliedCount = 0;
    let reviewCount = 0;
    let skipped = 0;
    let processed = 0;

    for (const companyId of ids) {
      const result = await classifyCompanyCategory({
        organizationId: context.organization.id,
        companyId,
        supabase,
        useAi: true,
      });
      const applied = await applyClassificationResult(supabase, {
        organizationId: context.organization.id,
        companyId,
        result,
        source: "bulk",
        actorUserId: context.membership.user_id,
      });
      processed += 1;
      if (applied.skippedDueToOverride) skipped += 1;
      if (applied.applied) appliedCount += 1;
      if (applied.needsReview) reviewCount += 1;
    }

    revalidatePath("/companies");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: `Classified ${ids.length}: ${appliedCount} auto-assigned, ${reviewCount} need review, ${skipped} skipped (manual override).`,
      processed,
      total: ids.length,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Bulk classify failed."),
    };
  }
}

/**
 * Mark a manual category assignment as an override (called from assign action).
 */
export async function markManualCategoryOverride(input: {
  organizationId: string;
  companyId: string;
  oldCategoryId: string | null;
  newCategoryId: string | null;
  actorUserId: string;
}): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("companies")
    .update({
      category_manual_override: true,
      category_needs_review: false,
      category_classified_by: "manual",
      category_classified_at: new Date().toISOString(),
    })
    .eq("organization_id", input.organizationId)
    .eq("id", input.companyId);

  await supabase.from("company_category_classification_history").insert({
    organization_id: input.organizationId,
    company_id: input.companyId,
    old_category_id: input.oldCategoryId,
    new_category_id: input.newCategoryId,
    suggested_category_id: null,
    confidence: null,
    reason: "User manually assigned category.",
    event_type: "manual_override",
    is_automatic: false,
    actor_user_id: input.actorUserId,
    metadata_json: asJson({}),
  });

  await supabase
    .from("company_category_classifications")
    .upsert(
      {
        organization_id: input.organizationId,
        company_id: input.companyId,
        suggested_category_id: input.newCategoryId,
        applied_category_id: input.newCategoryId,
        confidence: 100,
        confidence_band: "auto_select",
        reason: "Manual override by user.",
        keywords_json: asJson([]),
        alternatives_json: asJson([]),
        input_summary_json: asJson({ manual: true }),
        source: "manual_reclassify",
        classified_by: "manual",
        actor_user_id: input.actorUserId,
        manual_override: true,
        needs_review: false,
      },
      { onConflict: "company_id" },
    );
}
