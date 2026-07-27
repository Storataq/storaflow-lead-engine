"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  AI_FEEDBACK_CODES,
  AI_GENERATION_TYPES,
  AI_REWRITE_OPS,
  AI_TONES,
} from "@/lib/email/ai/constants";
import { runAIGeneration } from "@/lib/email/ai/generate";
import { classifyReplyWithOptionalAI } from "@/lib/email/ai/classify-reply";
import { listBrandVoices } from "@/lib/email/ai/queries";
import {
  ensureEmailAISettings,
  updateEmailAISettings,
} from "@/lib/email/ai/settings";
import { createServiceClient } from "@/lib/supabase/admin";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { buildEmailAnalyticsDashboard } from "@/lib/email/analytics/service";

export type AIActionResult = {
  success: boolean;
  message: string;
  generationId?: string;
  variants?: unknown[];
  warnings?: string[];
  errorCode?: string;
};

function canManageAI(role: string | undefined) {
  return role === "owner" || role === "admin";
}

const generateSchema = z.object({
  generationType: z.enum(AI_GENERATION_TYPES),
  tone: z.enum(AI_TONES).optional(),
  language: z.string().max(16).optional(),
  campaignPurpose: z.string().max(2000).optional(),
  audienceSummary: z.string().max(2000).optional(),
  offer: z.string().max(2000).optional(),
  callToAction: z.string().max(500).optional(),
  existingSubject: z.string().max(500).optional(),
  existingPreview: z.string().max(500).optional(),
  existingBody: z.string().max(20000).optional(),
  rewriteOp: z.enum(AI_REWRITE_OPS).optional(),
  targetLanguage: z.string().max(16).optional(),
  templateId: z.string().uuid().optional(),
  sequenceId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
  variantCount: z.coerce.number().int().min(1).max(5).optional(),
});

export async function generateEmailAIAction(
  formData: FormData,
): Promise<AIActionResult> {
  const context = await getActiveOrganization();
  if (!context) {
    return { success: false, message: "Not authenticated." };
  }

  const parsed = generateSchema.safeParse({
    generationType: formData.get("generationType"),
    tone: formData.get("tone") || undefined,
    language: formData.get("language") || undefined,
    campaignPurpose: formData.get("campaignPurpose") || undefined,
    audienceSummary: formData.get("audienceSummary") || undefined,
    offer: formData.get("offer") || undefined,
    callToAction: formData.get("callToAction") || undefined,
    existingSubject: formData.get("existingSubject") || undefined,
    existingPreview: formData.get("existingPreview") || undefined,
    existingBody: formData.get("existingBody") || undefined,
    rewriteOp: formData.get("rewriteOp") || undefined,
    targetLanguage: formData.get("targetLanguage") || undefined,
    templateId: formData.get("templateId") || undefined,
    sequenceId: formData.get("sequenceId") || undefined,
    campaignId: formData.get("campaignId") || undefined,
    variantCount: formData.get("variantCount") || undefined,
  });

  if (!parsed.success) {
    return { success: false, message: "Invalid AI generation request." };
  }

  const voices = await listBrandVoices(context.organization.id);
  const settings = await ensureEmailAISettings(context.organization.id);
  const activeVoice = voices.find(
    (v: { id: string }) => v.id === settings.active_brand_voice_id,
  );

  const result = await runAIGeneration({
    organizationId: context.organization.id,
    userId: context.membership.user_id,
    generationType: parsed.data.generationType,
    context: {
      tone: parsed.data.tone,
      language: parsed.data.language,
      campaignPurpose: parsed.data.campaignPurpose,
      audienceSummary: parsed.data.audienceSummary,
      offer: parsed.data.offer,
      callToAction: parsed.data.callToAction,
      existingSubject: parsed.data.existingSubject,
      existingPreview: parsed.data.existingPreview,
      existingBody: parsed.data.existingBody,
      rewriteOp: parsed.data.rewriteOp,
      targetLanguage: parsed.data.targetLanguage,
      replyText:
        parsed.data.generationType === "reply_draft" ||
        parsed.data.generationType === "reply_classification"
          ? parsed.data.existingBody
          : undefined,
      useReplyContent:
        parsed.data.generationType === "reply_draft" ||
        parsed.data.generationType === "reply_classification",
      brandVoiceSummary: activeVoice
        ? `${activeVoice.voice_name}: ${activeVoice.description ?? ""} (${activeVoice.formality})`
        : undefined,
    },
    sourceTemplateId: parsed.data.templateId,
    sourceSequenceId: parsed.data.sequenceId,
    sourceCampaignId: parsed.data.campaignId,
    variantCount: parsed.data.variantCount,
  });

  if (result.error) {
    return {
      success: false,
      message: result.error.message,
      errorCode: result.error.code,
      warnings: result.warnings,
      generationId: result.generationId,
    };
  }

  revalidatePath("/email/ai/history");
  return {
    success: true,
    message: "AI draft generated. Review before applying to a template draft.",
    generationId: result.generationId,
    variants: result.variants,
    warnings: result.warnings,
  };
}

export async function approveAIGenerationAction(
  generationId: string,
  variantId?: string,
): Promise<AIActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Not authenticated." };

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const supabase = createServiceClient() as any;
  const { data: generation } = await supabase
    .from("email_ai_generations")
    .select("id, approval_state")
    .eq("organization_id", context.organization.id)
    .eq("id", generationId)
    .maybeSingle();

  if (!generation) {
    return { success: false, message: "Generation not found." };
  }

  await supabase
    .from("email_ai_generations")
    .update({
      approval_state: "approved",
      status: "approved",
    })
    .eq("id", generationId)
    .eq("organization_id", context.organization.id);

  if (variantId) {
    await supabase
      .from("email_ai_generation_variants")
      .update({ is_selected: true, is_rejected: false })
      .eq("id", variantId)
      .eq("organization_id", context.organization.id);
  }

  await supabase.from("email_ai_approval_events").insert({
    organization_id: context.organization.id,
    generation_id: generationId,
    variant_id: variantId ?? null,
    actor_user_id: context.membership.user_id,
    event_type: "approved",
    previous_state: generation.approval_state,
    new_state: "approved",
  });

  revalidatePath("/email/ai/history");
  return {
    success: true,
    message: "Marked approved. Apply manually to a draft — AI does not send.",
    generationId,
  };
}

export async function rejectAIGenerationAction(
  generationId: string,
): Promise<AIActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Not authenticated." };

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const supabase = createServiceClient() as any;
  await supabase
    .from("email_ai_generations")
    .update({ approval_state: "rejected", status: "rejected" })
    .eq("id", generationId)
    .eq("organization_id", context.organization.id);

  await supabase.from("email_ai_approval_events").insert({
    organization_id: context.organization.id,
    generation_id: generationId,
    actor_user_id: context.membership.user_id,
    event_type: "rejected",
    new_state: "rejected",
  });

  revalidatePath("/email/ai/history");
  return { success: true, message: "Generation rejected.", generationId };
}

export async function applyAIVariantToTemplateDraftAction(input: {
  generationId: string;
  variantId: string;
  templateId: string;
}): Promise<AIActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Not authenticated." };

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const supabase = createServiceClient() as any;

  const { data: generation } = await supabase
    .from("email_ai_generations")
    .select("id, approval_state")
    .eq("organization_id", context.organization.id)
    .eq("id", input.generationId)
    .maybeSingle();

  if (!generation) {
    return { success: false, message: "Generation not found." };
  }
  if (
    generation.approval_state !== "approved" &&
    generation.approval_state !== "needs_review"
  ) {
    return {
      success: false,
      message: "Approve or explicitly select the variant before applying.",
    };
  }

  const { data: variant } = await supabase
    .from("email_ai_generation_variants")
    .select("*")
    .eq("organization_id", context.organization.id)
    .eq("id", input.variantId)
    .maybeSingle();

  if (!variant) {
    return { success: false, message: "Variant not found." };
  }

  const { data: template } = await supabase
    .from("email_templates")
    .select("id, status, version")
    .eq("organization_id", context.organization.id)
    .eq("id", input.templateId)
    .maybeSingle();

  if (!template) {
    return { success: false, message: "Template not found." };
  }
  if (template.status === "active") {
    return {
      success: false,
      message:
        "Cannot overwrite an active template. Duplicate or edit a draft template.",
    };
  }

  const patch: Record<string, unknown> = {
    status: "draft",
  };
  if (variant.subject) patch.subject = variant.subject;
  if (variant.preview_text) patch.preview_text = variant.preview_text;
  if (variant.html_body) patch.html_body = variant.html_body;
  if (variant.plain_text) patch.text_body = variant.plain_text;

  const { error } = await supabase
    .from("email_templates")
    .update(patch)
    .eq("id", input.templateId)
    .eq("organization_id", context.organization.id);

  if (error) {
    return { success: false, message: error.message };
  }

  await supabase
    .from("email_ai_generations")
    .update({
      approval_state: "applied_to_draft",
      status: "applied_to_draft",
    })
    .eq("id", input.generationId);

  await supabase.from("email_ai_approval_events").insert({
    organization_id: context.organization.id,
    generation_id: input.generationId,
    variant_id: input.variantId,
    actor_user_id: context.membership.user_id,
    event_type: "applied_to_draft",
    new_state: "applied_to_draft",
    notes: `Applied to template ${input.templateId}`,
  });

  revalidatePath(`/email/templates/${input.templateId}/edit`);
  revalidatePath("/email/ai/history");
  return {
    success: true,
    message: "Applied to template draft. Review and save before activating.",
    generationId: input.generationId,
  };
}

export async function saveAISettingsAction(
  formData: FormData,
): Promise<AIActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Not authenticated." };
  if (!canManageAI(context.membership.role)) {
    return { success: false, message: "Only owners/admins can manage AI settings." };
  }

  const bool = (key: string) => formData.get(key) === "on" || formData.get(key) === "true";

  const result = await updateEmailAISettings(context.organization.id, {
    ai_enabled: bool("ai_enabled"),
    writing_enabled: bool("writing_enabled"),
    reply_classification_enabled: bool("reply_classification_enabled"),
    reply_drafting_enabled: bool("reply_drafting_enabled"),
    analytics_insights_enabled: bool("analytics_insights_enabled"),
    translation_enabled: bool("translation_enabled"),
    personalization_enabled: bool("personalization_enabled"),
    context_enrichment_enabled: bool("context_enrichment_enabled"),
    automatic_actions_enabled: false,
    preferred_provider: String(formData.get("preferred_provider") || "openai"),
    preferred_model: String(formData.get("preferred_model") || "") || null,
    monthly_budget: formData.get("monthly_budget")
      ? Number(formData.get("monthly_budget"))
      : null,
    daily_budget: formData.get("daily_budget")
      ? Number(formData.get("daily_budget"))
      : null,
    use_minimal_context: bool("use_minimal_context"),
    use_reply_content: bool("use_reply_content"),
    use_analytics: bool("use_analytics"),
    allow_provider_training: bool("allow_provider_training"),
    store_generated_content: bool("store_generated_content"),
    organization_instructions:
      String(formData.get("organization_instructions") || "") || null,
  } as Partial<import("@/lib/email/ai/settings").EmailAISettingsRow>);

  revalidatePath("/settings/ai");
  revalidatePath("/email/settings");
  return {
    success: result.ok,
    message: result.message,
  };
}

export async function saveAISettingsFormAction(
  formData: FormData,
): Promise<void> {
  await saveAISettingsAction(formData);
}

export async function saveBrandVoiceAction(
  formData: FormData,
): Promise<AIActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Not authenticated." };
  if (!canManageAI(context.membership.role)) {
    return { success: false, message: "Only owners/admins can manage brand voice." };
  }

  const name = String(formData.get("voice_name") || "").trim();
  if (!name) return { success: false, message: "Voice name is required." };

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const supabase = createServiceClient() as any;
  const { error } = await supabase.from("email_ai_brand_voices").insert({
    organization_id: context.organization.id,
    voice_name: name,
    description: String(formData.get("description") || "") || null,
    formality: String(formData.get("formality") || "professional"),
    humor_level: String(formData.get("humor_level") || "none"),
    emoji_policy: String(formData.get("emoji_policy") || "none"),
    preferred_greeting: String(formData.get("preferred_greeting") || "") || null,
    preferred_sign_off: String(formData.get("preferred_sign_off") || "") || null,
    example_content: String(formData.get("example_content") || "") || null,
    created_by: context.membership.user_id,
    is_active: true,
  });

  if (error) return { success: false, message: error.message };
  revalidatePath("/settings/ai");
  return { success: true, message: "Brand voice saved." };
}

export async function saveBrandVoiceFormAction(
  formData: FormData,
): Promise<void> {
  await saveBrandVoiceAction(formData);
}

export async function submitAIFeedbackAction(
  formData: FormData,
): Promise<AIActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Not authenticated." };

  const generationId = String(formData.get("generationId") || "");
  const feedbackCode = String(formData.get("feedbackCode") || "");
  if (!generationId || !AI_FEEDBACK_CODES.includes(feedbackCode as any)) {
    return { success: false, message: "Invalid feedback." };
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const supabase = createServiceClient() as any;
  const { error } = await supabase.from("email_ai_feedback").insert({
    organization_id: context.organization.id,
    generation_id: generationId,
    variant_id: formData.get("variantId") || null,
    user_id: context.membership.user_id,
    feedback_code: feedbackCode,
    notes: String(formData.get("notes") || "") || null,
  });

  if (error) return { success: false, message: error.message };
  return { success: true, message: "Feedback recorded." };
}

export async function classifyReplyAction(
  formData: FormData,
): Promise<AIActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Not authenticated." };

  const subject = String(formData.get("subject") || "");
  const body = String(formData.get("body") || "");
  if (!body.trim()) {
    return { success: false, message: "Reply body is required." };
  }

  const result = await classifyReplyWithOptionalAI({
    organizationId: context.organization.id,
    userId: context.membership.user_id,
    subject,
    body,
  });

  return {
    success: true,
    message: `Classification: ${result.finalClassification} (${result.finalSource}). Manual review ${result.requiresManualReview ? "required" : "optional"}.`,
    generationId: result.classificationId,
    warnings: result.requiresManualReview
      ? ["High-impact or uncertain classification — do not auto-continue sequences."]
      : [],
  };
}

export async function requestAICampaignInsightAction(): Promise<AIActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Not authenticated." };

  const dashboard = await buildEmailAnalyticsDashboard({
    organizationId: context.organization.id,
    rangeKey: "last_30_days",
    includeRevenue: true,
  });

  const result = await runAIGeneration({
    organizationId: context.organization.id,
    userId: context.membership.user_id,
    generationType: "performance_insight",
    context: {
      useAnalytics: true,
      analyticsSummary: {
        kpis: dashboard.kpis,
        warnings: dashboard.warnings,
        insights: dashboard.insights,
        sampleSize: dashboard.sampleSize,
        delivery: dashboard.delivery,
        engagement: dashboard.engagement,
      },
    },
  });

  if (result.error) {
    return {
      success: false,
      message: result.error.message,
      errorCode: result.error.code,
    };
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const supabase = createServiceClient() as any;
  const { data: gen } = await supabase
    .from("email_ai_generations")
    .select("result_json, confidence")
    .eq("id", result.generationId)
    .maybeSingle();

  const rj = gen?.result_json ?? {};
  await supabase.from("email_ai_insights").insert({
    organization_id: context.organization.id,
    generation_id: result.generationId,
    insight_code: "ai_performance_insight",
    title: rj.title ?? "AI performance observation",
    explanation: rj.summary ?? "See generation result.",
    severity: "informational",
    confidence: gen?.confidence ?? result.confidence,
    supporting_metrics_json: {
      sampleSize: dashboard.sampleSize,
      warnings: dashboard.warnings,
    },
    data_quality_json: dashboard.warnings,
    date_range_json: {
      label: dashboard.range.label,
    },
    review_status: "open",
  });

  revalidatePath("/email/analytics/insights");
  return {
    success: true,
    message:
      "Insight generated from Phase 21J metrics. Correlation only — not causation.",
    generationId: result.generationId,
    warnings: result.warnings,
  };
}

export async function dismissAIInsightAction(
  insightId: string,
): Promise<AIActionResult> {
  const context = await getActiveOrganization();
  if (!context) return { success: false, message: "Not authenticated." };

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const supabase = createServiceClient() as any;
  await supabase
    .from("email_ai_insights")
    .update({ review_status: "dismissed" })
    .eq("id", insightId)
    .eq("organization_id", context.organization.id);

  revalidatePath("/email/analytics/insights");
  return { success: true, message: "Insight dismissed." };
}
