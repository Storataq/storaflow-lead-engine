/**
 * Phase 21K — Email AI Intelligence public surface.
 */

export {
  AI_GENERATION_TYPES,
  AI_GENERATION_TYPE_LABELS,
  AI_TONES,
  AI_REWRITE_OPS,
  AI_REPLY_CLASSIFICATIONS,
  AI_NEXT_ACTIONS,
  AI_FEEDBACK_CODES,
  AI_ALLOWED_CONTEXT_FIELDS,
  DEFAULT_AI_MODELS,
  isAiGloballyEnabled,
  getDefaultAiModel,
  getAiProviderCode,
} from "@/lib/email/ai/constants";

export type * from "@/lib/email/ai/types";

export { createAIProvider, getAIProviderDiagnostics } from "@/lib/email/ai/provider";
export { buildAIContext, contextManifestFrom } from "@/lib/email/ai/context";
export {
  validateGeneratedContent,
  validateGeneratedVariables,
  filterAllowedCrmFields,
} from "@/lib/email/ai/safety";
export {
  classifyReplyDeterministic,
  classifyReplyWithOptionalAI,
} from "@/lib/email/ai/classify-reply";
export { runAIGeneration } from "@/lib/email/ai/generate";
export {
  getEmailAISettings,
  ensureEmailAISettings,
  toGenerationPolicy,
  updateEmailAISettings,
} from "@/lib/email/ai/settings";
export {
  listAIGenerations,
  getAIGenerationDetail,
  listBrandVoices,
  listAIInsights,
  listAIUsageSummary,
} from "@/lib/email/ai/queries";
