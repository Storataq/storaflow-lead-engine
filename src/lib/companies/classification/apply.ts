import type { Json } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import type { ApplyClassificationInput } from "@/lib/companies/classification/types";

type Client = SupabaseClient<Database>;

function asJson(value: unknown): Json {
  return value as Json;
}

/**
 * Persist classification + optionally assign category based on confidence band.
 * Never overwrites when category_manual_override is true (unless force/reset).
 */
export async function applyClassificationResult(
  supabase: Client,
  input: ApplyClassificationInput,
): Promise<{
  applied: boolean;
  needsReview: boolean;
  skippedDueToOverride: boolean;
  classificationId: string | null;
}> {
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select(
      "id, company_category_id, category_manual_override, suggested_company_category_id",
    )
    .eq("organization_id", input.organizationId)
    .eq("id", input.companyId)
    .maybeSingle();

  if (companyError || !company) {
    throw new Error(companyError?.message ?? "Company not found.");
  }

  const manualOverride = Boolean(company.category_manual_override);
  if (manualOverride && !input.force && !input.resetManualOverride) {
    // Still store suggestion for transparency, but do not change assigned category.
    const needsReview =
      input.result.confidenceBand !== "auto_select" ||
      !input.result.suggestedCategoryId;

    const { data: classification, error } = await supabase
      .from("company_category_classifications")
      .upsert(
        {
          organization_id: input.organizationId,
          company_id: input.companyId,
          suggested_category_id: input.result.suggestedCategoryId,
          applied_category_id: company.company_category_id,
          confidence: input.result.confidence,
          confidence_band: input.result.confidenceBand,
          reason: input.result.reason,
          keywords_json: asJson(input.result.keywordsFound),
          alternatives_json: asJson(input.result.alternatives),
          input_summary_json: asJson(input.result.inputSummary),
          source: input.source,
          classified_by: input.result.classifiedBy,
          provider: input.result.provider,
          model: input.result.model,
          actor_user_id: input.actorUserId ?? null,
          manual_override: true,
          needs_review: needsReview,
        },
        { onConflict: "company_id" },
      )
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await supabase
      .from("companies")
      .update({
        suggested_company_category_id: input.result.suggestedCategoryId,
        category_confidence: input.result.confidence,
        category_needs_review: needsReview,
        category_classified_at: new Date().toISOString(),
        category_classified_by: "automatic",
      })
      .eq("organization_id", input.organizationId)
      .eq("id", input.companyId);

    await supabase.from("company_category_classification_history").insert({
      organization_id: input.organizationId,
      company_id: input.companyId,
      classification_id: classification.id,
      old_category_id: company.company_category_id,
      new_category_id: company.company_category_id,
      suggested_category_id: input.result.suggestedCategoryId,
      confidence: input.result.confidence,
      reason: "Suggestion stored; manual override preserved.",
      event_type: "suggestion_only",
      is_automatic: true,
      actor_user_id: input.actorUserId ?? null,
      metadata_json: asJson({ skippedDueToOverride: true, source: input.source }),
    });

    return {
      applied: false,
      needsReview,
      skippedDueToOverride: true,
      classificationId: classification.id,
    };
  }

  const shouldAutoAssign =
    input.result.confidenceBand === "auto_select" &&
    Boolean(input.result.suggestedCategoryId);

  const needsReview =
    !shouldAutoAssign ||
    input.result.confidenceBand === "needs_confirmation" ||
    input.result.confidenceBand === "possible" ||
    input.result.confidenceBand === "unknown";

  const nextCategoryId = shouldAutoAssign
    ? input.result.suggestedCategoryId
    : company.company_category_id;

  const clearOverride = Boolean(input.resetManualOverride);

  const { data: classification, error } = await supabase
    .from("company_category_classifications")
    .upsert(
      {
        organization_id: input.organizationId,
        company_id: input.companyId,
        suggested_category_id: input.result.suggestedCategoryId,
        applied_category_id: nextCategoryId,
        confidence: input.result.confidence,
        confidence_band: input.result.confidenceBand,
        reason: input.result.reason,
        keywords_json: asJson(input.result.keywordsFound),
        alternatives_json: asJson(input.result.alternatives),
        input_summary_json: asJson(input.result.inputSummary),
        source: input.source,
        classified_by: input.result.classifiedBy,
        provider: input.result.provider,
        model: input.result.model,
        actor_user_id: input.actorUserId ?? null,
        manual_override: clearOverride ? false : manualOverride,
        needs_review: needsReview,
      },
      { onConflict: "company_id" },
    )
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await supabase
    .from("companies")
    .update({
      company_category_id: nextCategoryId,
      suggested_company_category_id: input.result.suggestedCategoryId,
      category_confidence: input.result.confidence,
      category_needs_review: needsReview,
      category_manual_override: clearOverride ? false : manualOverride,
      category_classified_at: new Date().toISOString(),
      category_classified_by: shouldAutoAssign
        ? input.result.classifiedBy === "hybrid"
          ? "hybrid"
          : "automatic"
        : company.company_category_id
          ? "manual"
          : "automatic",
    })
    .eq("organization_id", input.organizationId)
    .eq("id", input.companyId);

  const eventType =
    input.source === "bulk"
      ? "bulk_classify"
      : input.source === "enrichment"
        ? "enrichment_classify"
        : input.source === "scrape" || input.source === "search"
          ? "scrape_classify"
          : input.resetManualOverride
            ? "reset_automatic"
            : shouldAutoAssign
              ? "automatic_assign"
              : "suggestion_only";

  await supabase.from("company_category_classification_history").insert({
    organization_id: input.organizationId,
    company_id: input.companyId,
    classification_id: classification.id,
    old_category_id: company.company_category_id,
    new_category_id: nextCategoryId,
    suggested_category_id: input.result.suggestedCategoryId,
    confidence: input.result.confidence,
    reason: input.result.reason,
    event_type: eventType,
    is_automatic: true,
    actor_user_id: input.actorUserId ?? null,
    metadata_json: asJson({
      band: input.result.confidenceBand,
      source: input.source,
      applied: shouldAutoAssign,
    }),
  });

  return {
    applied: shouldAutoAssign,
    needsReview,
    skippedDueToOverride: false,
    classificationId: classification.id,
  };
}
