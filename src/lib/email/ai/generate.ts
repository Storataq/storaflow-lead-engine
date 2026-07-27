/**
 * Phase 21K — shared AI generation service.
 * Never sends mail or activates campaigns/sequences.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { z } from "zod";

import {
  getDefaultAiModel,
  type AIGenerationType,
  type AIConfidence,
} from "@/lib/email/ai/constants";
import {
  buildAIContext,
  contextManifestFrom,
  type BuildAIContextInput,
} from "@/lib/email/ai/context";
import { buildSystemPrompt, buildUserPrompt, PROMPT_VERSION } from "@/lib/email/ai/prompts";
import { createAIProvider } from "@/lib/email/ai/provider";
import { validateGeneratedContent } from "@/lib/email/ai/safety";
import {
  ensureEmailAISettings,
  toGenerationPolicy,
} from "@/lib/email/ai/settings";
import type {
  AIContentVariant,
  AIError,
  AIGenerationResult,
} from "@/lib/email/ai/types";
import {
  assertRateLimit,
  assertWithinBudget,
  buildIdempotencyKey,
  findGenerationByIdempotency,
  fingerprintRequest,
  recordUsage,
} from "@/lib/email/ai/usage";
import { createServiceClient } from "@/lib/supabase/admin";

type SupabaseLike = any;

const variantSchema = z.object({
  subject: z.string().optional(),
  previewText: z.string().optional(),
  htmlBody: z.string().optional(),
  plainText: z.string().optional(),
  cta: z.string().optional(),
  style: z.string().optional(),
  estimatedIntent: z.string().optional(),
  personalizationVars: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
  assumptions: z.array(z.string()).optional(),
  label: z.string().optional(),
});

const writingResultSchema = z.object({
  variants: z.array(variantSchema).min(1).max(5),
  confidence: z
    .enum(["low", "medium", "high", "not_enough_data"])
    .default("medium"),
  issues: z.array(z.string()).optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  steps: z.array(z.record(z.string(), z.unknown())).optional(),
  stopRules: z.array(z.unknown()).optional(),
  risks: z.array(z.string()).optional(),
  missingContext: z.array(z.string()).optional(),
  title: z.string().optional(),
  summary: z.string().optional(),
  importantChanges: z.array(z.string()).optional(),
  opportunities: z.array(z.string()).optional(),
  dataQualityWarnings: z.array(z.string()).optional(),
  causationClaimed: z.boolean().optional(),
  classification: z.string().optional(),
  explanation: z.string().optional(),
  evidenceSnippets: z.array(z.string()).optional(),
  requiresManualReview: z.boolean().optional(),
  nextActions: z.array(z.record(z.string(), z.unknown())).optional(),
  actions: z.array(z.record(z.string(), z.unknown())).optional(),
  suggestions: z.array(z.record(z.string(), z.unknown())).optional(),
});

function featureForType(type: AIGenerationType): string {
  if (type === "reply_classification" || type === "reply_draft") return "reply";
  if (type === "campaign_summary" || type === "performance_insight")
    return "analytics";
  if (type === "sequence_draft") return "sequence";
  return "writing";
}

function policyAllows(
  type: AIGenerationType,
  policy: ReturnType<typeof toGenerationPolicy>,
): { ok: true } | { ok: false; error: AIError } {
  if (!policy.aiEnabled) {
    return {
      ok: false,
      error: {
        code: "ai_disabled",
        message: "AI is disabled for this organization or environment.",
        class: "user_correctable",
        retryable: false,
      },
    };
  }
  if (
    (type === "reply_classification" && !policy.replyClassificationEnabled) ||
    (type === "reply_draft" && !policy.replyDraftingEnabled) ||
    ((type === "campaign_summary" || type === "performance_insight") &&
      !policy.analyticsInsightsEnabled) ||
    (type === "translation" && !policy.translationEnabled)
  ) {
    return {
      ok: false,
      error: {
        code: "feature_disabled",
        message: `AI feature for ${type} is disabled.`,
        class: "user_correctable",
        retryable: false,
      },
    };
  }
  if (
    ![
      "reply_classification",
      "reply_draft",
      "campaign_summary",
      "performance_insight",
    ].includes(type) &&
    !policy.writingEnabled
  ) {
    return {
      ok: false,
      error: {
        code: "writing_disabled",
        message: "AI writing is disabled.",
        class: "user_correctable",
        retryable: false,
      },
    };
  }
  return { ok: true };
}

function toVariants(
  parsed: z.infer<typeof writingResultSchema>,
  maxVariants: number,
): AIContentVariant[] {
  const list = parsed.variants.slice(0, maxVariants);
  return list.map((v, index) => ({
    index,
    label: v.label ?? `Variant ${index + 1}`,
    subject: v.subject,
    previewText: v.previewText,
    htmlBody: v.htmlBody,
    plainText: v.plainText,
    cta: v.cta,
    personalizationVars: v.personalizationVars ?? [],
    assumptions: v.assumptions ?? [],
    warnings: v.warnings ?? [],
    style: v.style,
    estimatedIntent: v.estimatedIntent,
  }));
}

function collectSafety(variants: AIContentVariant[]) {
  const flags = [];
  for (const v of variants) {
    flags.push(
      ...validateGeneratedContent({
        subject: v.subject,
        previewText: v.previewText,
        body: v.htmlBody ?? v.plainText,
        plainText: v.plainText,
      }),
    );
  }
  return flags;
}

export async function runAIGeneration(input: {
  organizationId: string;
  userId: string;
  generationType: AIGenerationType;
  context: Omit<BuildAIContextInput, "organizationId" | "userId">;
  extras?: Record<string, unknown>;
  sourceTemplateId?: string | null;
  sourceSequenceId?: string | null;
  sourceCampaignId?: string | null;
  sourceReplyEventId?: string | null;
  variantCount?: number;
}): Promise<AIGenerationResult> {
  const settings = await ensureEmailAISettings(input.organizationId);
  const policy = toGenerationPolicy(settings);
  const allowed = policyAllows(input.generationType, policy);
  if (!allowed.ok) {
    return failedResult(input.generationType, allowed.error);
  }

  // Hard guarantee: never auto-actions in this phase.
  if (settings.automatic_actions_enabled || process.env.EMAIL_AI_AUTO_ACTIONS_ENABLED === "true") {
    console.warn("[email_ai] automatic_actions_blocked", {
      organizationId: input.organizationId,
    });
  }

  const rate = await assertRateLimit({
    organizationId: input.organizationId,
    userId: input.userId,
    feature: featureForType(input.generationType),
  });
  if (!rate.ok) {
    return failedResult(input.generationType, {
      code: rate.code,
      message: rate.message,
      class: "retryable",
      retryable: true,
    });
  }

  const budget = await assertWithinBudget({
    organizationId: input.organizationId,
    userId: input.userId,
    settings,
  });
  if (!budget.ok) {
    return failedResult(input.generationType, {
      code: budget.code,
      message: budget.message,
      class: "user_correctable",
      retryable: false,
    });
  }

  const context = buildAIContext({
    organizationId: input.organizationId,
    userId: input.userId,
    useMinimalContext: settings.use_minimal_context,
    useReplyContent: settings.use_reply_content,
    useAnalytics: settings.use_analytics,
    brandVoiceSummary: input.context.brandVoiceSummary,
    ...input.context,
  });

  if (settings.organization_instructions) {
    context.complianceNotes.push(
      `Organization instructions: ${settings.organization_instructions}`,
    );
  }

  const fingerprint = fingerprintRequest({
    type: input.generationType,
    context: contextManifestFrom(context),
    extras: input.extras ?? {},
  });
  const idempotencyKey = buildIdempotencyKey({
    organizationId: input.organizationId,
    userId: input.userId,
    generationType: input.generationType,
    fingerprint,
  });

  const existing = await findGenerationByIdempotency(
    input.organizationId,
    idempotencyKey,
  );
  if (existing?.id) {
    const resultJson = existing.result_json ?? {};
    const variants = Array.isArray(resultJson.variants)
      ? resultJson.variants
      : [];
    return {
      generationId: existing.id,
      generationType: input.generationType,
      status: existing.approval_state ?? "needs_review",
      approvalState: existing.approval_state ?? "needs_review",
      variants,
      confidence: (existing.confidence as AIConfidence) ?? "medium",
      warnings: existing.warnings_json ?? [
        "Returned cached result for identical recent request.",
      ],
      safetyFlags: [],
      usage: null,
      provider: existing.provider_code ?? "openai",
      model: existing.model,
    };
  }

  const provider = createAIProvider(settings.preferred_provider);
  if (!provider.isConfigured()) {
    return failedResult(input.generationType, {
      code: "provider_unavailable",
      message:
        "AI provider is not configured. Set OPENAI_API_KEY and enable AI in settings.",
      class: "administrator_correctable",
      retryable: false,
    });
  }

  const model =
    settings.preferred_model?.trim() || getDefaultAiModel();
  const maxVariants = Math.min(
    input.variantCount ?? policy.maxVariants,
    policy.maxVariants,
    5,
  );

  const system = buildSystemPrompt(input.generationType);
  const user = buildUserPrompt(input.generationType, context, {
    ...input.extras,
    maxVariants,
  });

  const maxRetries = Number(process.env.EMAIL_AI_MAX_RETRIES ?? 1);
  let lastError: AIError | null = null;
  let responseContent = "";
  let usage = null;
  let usedModel: string | null = model;

  for (let attempt = 0; attempt <= Math.max(0, maxRetries); attempt++) {
    try {
      console.info("[email_ai] request_started", {
        organizationId: input.organizationId,
        generationType: input.generationType,
        model,
        attempt,
      });
      const response = await provider.complete({
        model,
        system,
        user,
        maxOutputTokens: policy.perGenerationTokenLimit ?? undefined,
        responseFormat: "json",
      });
      responseContent = response.content;
      usage = response.usage;
      usedModel = response.model;
      lastError = null;
      break;
    } catch (error: any) {
      lastError = {
        code: error?.code ?? "provider_error",
        message: error?.message ?? "AI provider failed",
        class: error?.class ?? "non_retryable",
        retryable: Boolean(error?.retryable),
      };
      if (!lastError.retryable || attempt >= maxRetries) break;
    }
  }

  const supabase = createServiceClient() as SupabaseLike;

  if (lastError || !responseContent) {
    const { data: failedRow } = await supabase
      .from("email_ai_generations")
      .insert({
        organization_id: input.organizationId,
        requested_by: input.userId,
        generation_type: input.generationType,
        feature: featureForType(input.generationType),
        status: "failed",
        approval_state: "rejected",
        provider_code: provider.code,
        model: usedModel,
        prompt_template_code: input.generationType,
        prompt_version: PROMPT_VERSION,
        source_template_id: input.sourceTemplateId ?? null,
        source_sequence_id: input.sourceSequenceId ?? null,
        source_campaign_id: input.sourceCampaignId ?? null,
        source_reply_event_id: input.sourceReplyEventId ?? null,
        request_fingerprint: fingerprint,
        idempotency_key: idempotencyKey,
        context_manifest_json: contextManifestFrom(context),
        input_summary_json: {
          tone: context.tone,
          language: context.language,
        },
        error_code: lastError?.code ?? "empty_response",
        error_message: lastError?.message ?? "Empty AI response",
        warnings_json: ["Generation failed; email engine remains operational."],
      })
      .select("id")
      .single();

    await recordUsage({
      organizationId: input.organizationId,
      userId: input.userId,
      generationId: failedRow?.id,
      feature: featureForType(input.generationType),
      generationType: input.generationType,
      providerCode: provider.code,
      model: usedModel,
      usage,
      status: lastError?.code === "rate_limit" ? "rate_limited" : "failed",
      errorCode: lastError?.code,
      campaignId: input.sourceCampaignId,
      sequenceId: input.sourceSequenceId,
      templateId: input.sourceTemplateId,
    });

    return failedResult(
      input.generationType,
      lastError ?? {
        code: "empty_response",
        message: "Empty AI response",
        class: "retryable",
        retryable: true,
      },
      failedRow?.id,
    );
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(responseContent);
  } catch {
    return await persistInvalid(
      input,
      provider.code,
      usedModel,
      fingerprint,
      idempotencyKey,
      context,
      usage,
      "invalid_json",
      "Model returned non-JSON content.",
    );
  }

  const validated = writingResultSchema.safeParse(parsedJson);
  if (!validated.success) {
    return await persistInvalid(
      input,
      provider.code,
      usedModel,
      fingerprint,
      idempotencyKey,
      context,
      usage,
      "schema_validation_failure",
      validated.error.message,
    );
  }

  if (validated.data.causationClaimed) {
    validated.data.causationClaimed = false;
  }

  const variants = toVariants(validated.data, maxVariants);
  const safetyFlags = collectSafety(variants);
  const block = safetyFlags.some((f) => f.severity === "block");
  const warnings = [
    ...(validated.data.issues ?? []),
    ...safetyFlags.map((f) => f.message),
    ...(context.truncated
      ? ["Context was truncated; review completeness before use."]
      : []),
    "Human review required. AI output is not applied automatically.",
  ];

  const resultPayload = {
    ...validated.data,
    variants,
    causationClaimed: false,
  };

  const { data: generation, error: insertError } = await supabase
    .from("email_ai_generations")
    .insert({
      organization_id: input.organizationId,
      requested_by: input.userId,
      generation_type: input.generationType,
      feature: featureForType(input.generationType),
      status: block ? "needs_review" : "needs_review",
      approval_state: "needs_review",
      provider_code: provider.code,
      model: usedModel,
      prompt_template_code: input.generationType,
      prompt_version: PROMPT_VERSION,
      source_template_id: input.sourceTemplateId ?? null,
      source_sequence_id: input.sourceSequenceId ?? null,
      source_campaign_id: input.sourceCampaignId ?? null,
      source_reply_event_id: input.sourceReplyEventId ?? null,
      request_fingerprint: fingerprint,
      idempotency_key: idempotencyKey,
      context_manifest_json: contextManifestFrom(context),
      input_summary_json: {
        tone: context.tone,
        language: context.language,
        rewriteOp: context.rewriteOp,
      },
      result_json: policy.storeGeneratedContent ? resultPayload : { stored: false },
      validation_json: { ok: !block, safetyFlags },
      warnings_json: warnings,
      safety_json: { flags: safetyFlags, blocked: block },
      confidence: validated.data.confidence,
      duration_ms: usage?.durationMs ?? null,
    })
    .select("id")
    .single();

  if (insertError || !generation) {
    console.error("[email_ai] generation_persist_failed", {
      message: insertError?.message,
    });
  }

  const generationId = generation?.id ?? "unpersisted";

  if (policy.storeGeneratedContent && generation?.id) {
    await supabase.from("email_ai_generation_variants").insert(
      variants.map((v) => ({
        organization_id: input.organizationId,
        generation_id: generation.id,
        variant_index: v.index,
        label: v.label,
        content_json: v,
        subject: v.subject ?? null,
        preview_text: v.previewText ?? null,
        html_body: v.htmlBody ?? null,
        plain_text: v.plainText ?? null,
        cta: v.cta ?? null,
        personalization_vars_json: v.personalizationVars,
        assumptions_json: v.assumptions,
        warnings_json: v.warnings,
      })),
    );

    await supabase.from("email_ai_context_manifests").insert({
      organization_id: input.organizationId,
      generation_id: generation.id,
      sources_json: context.sources,
      allowed_fields_json: Object.keys(context.crmFields),
      redacted_fields_json: [],
      truncated: context.truncated,
      truncation_notes: context.truncationNotes ?? null,
      estimated_tokens: usage
        ? usage.inputTokens + usage.outputTokens
        : null,
    });
  }

  await recordUsage({
    organizationId: input.organizationId,
    userId: input.userId,
    generationId: generation?.id,
    feature: featureForType(input.generationType),
    generationType: input.generationType,
    providerCode: provider.code,
    model: usedModel,
    usage,
    status: "completed",
    campaignId: input.sourceCampaignId,
    sequenceId: input.sourceSequenceId,
    templateId: input.sourceTemplateId,
  });

  console.info("[email_ai] generation_completed", {
    organizationId: input.organizationId,
    generationId,
    generationType: input.generationType,
    variantCount: variants.length,
    blocked: block,
  });

  return {
    generationId,
    generationType: input.generationType,
    status: "needs_review",
    approvalState: "needs_review",
    variants,
    confidence: validated.data.confidence,
    warnings,
    safetyFlags: safetyFlags.map((f) => f.code),
    usage,
    provider: provider.code,
    model: usedModel,
  };
}

async function persistInvalid(
  input: {
    organizationId: string;
    userId: string;
    generationType: AIGenerationType;
    sourceTemplateId?: string | null;
    sourceSequenceId?: string | null;
    sourceCampaignId?: string | null;
    sourceReplyEventId?: string | null;
  },
  providerCode: string,
  model: string | null,
  fingerprint: string,
  idempotencyKey: string,
  context: ReturnType<typeof buildAIContext>,
  usage: any,
  code: string,
  message: string,
): Promise<AIGenerationResult> {
  const supabase = createServiceClient() as SupabaseLike;
  const { data } = await supabase
    .from("email_ai_generations")
    .insert({
      organization_id: input.organizationId,
      requested_by: input.userId,
      generation_type: input.generationType,
      feature: featureForType(input.generationType),
      status: "failed",
      approval_state: "rejected",
      provider_code: providerCode,
      model,
      prompt_version: PROMPT_VERSION,
      request_fingerprint: fingerprint,
      idempotency_key: idempotencyKey,
      context_manifest_json: contextManifestFrom(context),
      error_code: code,
      error_message: message,
      source_template_id: input.sourceTemplateId ?? null,
      source_sequence_id: input.sourceSequenceId ?? null,
      source_campaign_id: input.sourceCampaignId ?? null,
      source_reply_event_id: input.sourceReplyEventId ?? null,
    })
    .select("id")
    .single();

  await recordUsage({
    organizationId: input.organizationId,
    userId: input.userId,
    generationId: data?.id,
    feature: featureForType(input.generationType),
    generationType: input.generationType,
    providerCode,
    model,
    usage,
    status: "failed",
    errorCode: code,
  });

  return failedResult(
    input.generationType,
    {
      code,
      message,
      class: "retryable",
      retryable: true,
    },
    data?.id,
  );
}

function failedResult(
  generationType: AIGenerationType,
  error: AIError,
  generationId = "none",
): AIGenerationResult {
  return {
    generationId,
    generationType,
    status: "rejected",
    approvalState: "rejected",
    variants: [],
    confidence: "not_enough_data",
    warnings: [error.message],
    safetyFlags: [],
    usage: null,
    provider: "none",
    model: null,
    error,
  };
}
