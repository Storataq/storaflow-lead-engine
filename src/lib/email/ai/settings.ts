/**
 * Phase 21K — org AI settings load/save helpers.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createServiceClient } from "@/lib/supabase/admin";
import type { AIGenerationPolicy } from "@/lib/email/ai/types";
import { isAiGloballyEnabled } from "@/lib/email/ai/constants";

type SupabaseLike = any;

export type EmailAISettingsRow = {
  id: string;
  organization_id: string;
  ai_enabled: boolean;
  writing_enabled: boolean;
  reply_classification_enabled: boolean;
  reply_drafting_enabled: boolean;
  analytics_insights_enabled: boolean;
  translation_enabled: boolean;
  personalization_enabled: boolean;
  context_enrichment_enabled: boolean;
  automatic_actions_enabled: boolean;
  preferred_provider: string;
  preferred_model: string | null;
  monthly_budget: number | null;
  daily_budget: number | null;
  per_user_daily_limit: number | null;
  per_generation_token_limit: number | null;
  maximum_variants: number;
  warning_threshold_pct: number;
  hard_limit_enabled: boolean;
  use_minimal_context: boolean;
  use_selected_crm_fields: boolean;
  use_campaign_history: boolean;
  use_reply_content: boolean;
  use_analytics: boolean;
  use_organization_notes: boolean;
  allow_provider_retention: boolean;
  allow_provider_training: boolean;
  store_generated_content: boolean;
  store_raw_provider_response: boolean;
  organization_instructions: string | null;
  retention_days: number;
  active_brand_voice_id: string | null;
};

const DEFAULTS: Omit<EmailAISettingsRow, "id" | "organization_id"> = {
  ai_enabled: false,
  writing_enabled: false,
  reply_classification_enabled: false,
  reply_drafting_enabled: false,
  analytics_insights_enabled: false,
  translation_enabled: false,
  personalization_enabled: false,
  context_enrichment_enabled: false,
  automatic_actions_enabled: false,
  preferred_provider: "openai",
  preferred_model: null,
  monthly_budget: null,
  daily_budget: null,
  per_user_daily_limit: null,
  per_generation_token_limit: null,
  maximum_variants: 3,
  warning_threshold_pct: 80,
  hard_limit_enabled: true,
  use_minimal_context: true,
  use_selected_crm_fields: true,
  use_campaign_history: false,
  use_reply_content: false,
  use_analytics: true,
  use_organization_notes: false,
  allow_provider_retention: false,
  allow_provider_training: false,
  store_generated_content: true,
  store_raw_provider_response: false,
  organization_instructions: null,
  retention_days: 365,
  active_brand_voice_id: null,
};

export async function getEmailAISettings(
  organizationId: string,
): Promise<EmailAISettingsRow | null> {
  const supabase = createServiceClient() as SupabaseLike;
  const { data, error } = await supabase
    .from("email_ai_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    // Table may not exist until migration is applied.
    console.warn("[email_ai] settings_load_failed", {
      organizationId,
      message: error.message,
    });
    return null;
  }
  return (data as EmailAISettingsRow) ?? null;
}

export async function ensureEmailAISettings(
  organizationId: string,
): Promise<EmailAISettingsRow> {
  const existing = await getEmailAISettings(organizationId);
  if (existing) return existing;

  const supabase = createServiceClient() as SupabaseLike;
  const { data, error } = await supabase
    .from("email_ai_settings")
    .insert({
      organization_id: organizationId,
      ...DEFAULTS,
      // Force automatic actions off even if env mistakenly enables them.
      automatic_actions_enabled: false,
    })
    .select("*")
    .single();

  if (error || !data) {
    return {
      id: "ephemeral",
      organization_id: organizationId,
      ...DEFAULTS,
    };
  }
  return data as EmailAISettingsRow;
}

export function toGenerationPolicy(
  settings: EmailAISettingsRow | null,
): AIGenerationPolicy {
  const envOn = isAiGloballyEnabled();
  const s = settings;
  return {
    aiEnabled: envOn && Boolean(s?.ai_enabled),
    writingEnabled: envOn && Boolean(s?.ai_enabled && s?.writing_enabled),
    replyClassificationEnabled:
      envOn &&
      Boolean(s?.ai_enabled && s?.reply_classification_enabled) &&
      process.env.EMAIL_AI_REPLY_CLASSIFICATION_ENABLED !== "false",
    replyDraftingEnabled:
      envOn && Boolean(s?.ai_enabled && s?.reply_drafting_enabled),
    analyticsInsightsEnabled:
      envOn && Boolean(s?.ai_enabled && s?.analytics_insights_enabled),
    translationEnabled:
      envOn && Boolean(s?.ai_enabled && s?.translation_enabled),
    personalizationEnabled:
      envOn && Boolean(s?.ai_enabled && s?.personalization_enabled),
    contextEnrichmentEnabled:
      envOn && Boolean(s?.ai_enabled && s?.context_enrichment_enabled),
    // Always false unless both org + env explicitly allow (still never auto-sends).
    automaticActionsEnabled: false,
    storeGeneratedContent: s?.store_generated_content ?? true,
    storeRawProviderResponse:
      s?.store_raw_provider_response === true ||
      process.env.EMAIL_AI_STORE_RAW_RESPONSES === "true",
    maxVariants: s?.maximum_variants ?? 3,
    perGenerationTokenLimit:
      s?.per_generation_token_limit ??
      (Number(process.env.EMAIL_AI_MAX_OUTPUT_TOKENS ?? 2048) || null),
  };
}

export async function updateEmailAISettings(
  organizationId: string,
  patch: Partial<EmailAISettingsRow>,
): Promise<{ ok: boolean; message: string }> {
  const supabase = createServiceClient() as SupabaseLike;
  await ensureEmailAISettings(organizationId);

  const safePatch = {
    ...patch,
    automatic_actions_enabled: false,
    allow_provider_training:
      patch.allow_provider_training === true ? true : false,
  };
  delete (safePatch as any).id;
  delete (safePatch as any).organization_id;

  const { error } = await supabase
    .from("email_ai_settings")
    .update(safePatch)
    .eq("organization_id", organizationId);

  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true, message: "AI settings saved." };
}
