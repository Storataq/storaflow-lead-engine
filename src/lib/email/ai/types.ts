/**
 * Phase 21K — provider-agnostic AI domain types.
 */

import type {
  AIApprovalState,
  AIConfidence,
  AIGenerationType,
  AIReplyClassificationCode,
  AITone,
} from "@/lib/email/ai/constants";

export type AIProviderCode =
  | "openai"
  | "anthropic"
  | "google"
  | "azure_openai"
  | "self_hosted"
  | "none";

export type AIUsage = {
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  durationMs: number;
};

export type AIErrorClass =
  | "retryable"
  | "non_retryable"
  | "user_correctable"
  | "administrator_correctable";

export type AIError = {
  code: string;
  message: string;
  class: AIErrorClass;
  retryable: boolean;
};

export type AIRequest = {
  model: string;
  system: string;
  user: string;
  maxOutputTokens?: number;
  temperature?: number;
  responseFormat?: "json" | "text";
  timeoutMs?: number;
};

export type AIResponse = {
  content: string;
  model: string;
  usage: AIUsage;
  raw?: unknown;
};

export interface AIProvider {
  readonly code: AIProviderCode;
  isConfigured(): boolean;
  complete(request: AIRequest): Promise<AIResponse>;
}

export type AIModelConfiguration = {
  id: string;
  provider: AIProviderCode;
  structuredOutput: boolean;
  maxContext: number;
  maxOutput: number;
  costClass: "standard" | "expensive";
  latencyClass: "fast" | "medium" | "slow";
  status: "active" | "deprecated" | "disabled";
};

export type AIGenerationContext = {
  organizationId: string;
  userId: string;
  language?: string;
  tone?: AITone | string;
  brandVoiceSummary?: string;
  campaignPurpose?: string;
  communicationCategory?: string;
  audienceSummary?: string;
  offer?: string;
  callToAction?: string;
  existingSubject?: string;
  existingPreview?: string;
  existingBody?: string;
  rewriteOp?: string;
  targetLanguage?: string;
  allowedVariables: string[];
  crmFields: Record<string, string>;
  analyticsSummary?: Record<string, unknown>;
  replyText?: string;
  complianceNotes: string[];
  forbiddenClaims: string[];
  truncated: boolean;
  truncationNotes?: string;
  sources: string[];
};

export type AIContentVariant = {
  index: number;
  label?: string;
  subject?: string;
  previewText?: string;
  htmlBody?: string;
  plainText?: string;
  cta?: string;
  personalizationVars: string[];
  assumptions: string[];
  warnings: string[];
  style?: string;
  estimatedIntent?: string;
};

export type AIGenerationResult = {
  generationId: string;
  generationType: AIGenerationType;
  status: AIApprovalState;
  approvalState: AIApprovalState;
  variants: AIContentVariant[];
  confidence: AIConfidence;
  warnings: string[];
  safetyFlags: string[];
  usage: AIUsage | null;
  provider: AIProviderCode;
  model: string | null;
  error?: AIError;
};

export type AIReplyClassificationResult = {
  classificationId: string;
  deterministicClassification: string | null;
  aiClassification: AIReplyClassificationCode | null;
  confidence: AIConfidence;
  explanation: string;
  evidenceSnippets: string[];
  finalClassification: string;
  finalSource: "deterministic" | "ai" | "human";
  requiresManualReview: boolean;
  nextActions: Array<{
    actionCode: string;
    reason: string;
    confidence: AIConfidence;
    humanApprovalRequired: boolean;
  }>;
};

export type AIGenerationPolicy = {
  aiEnabled: boolean;
  writingEnabled: boolean;
  replyClassificationEnabled: boolean;
  replyDraftingEnabled: boolean;
  analyticsInsightsEnabled: boolean;
  translationEnabled: boolean;
  personalizationEnabled: boolean;
  contextEnrichmentEnabled: boolean;
  automaticActionsEnabled: boolean;
  storeGeneratedContent: boolean;
  storeRawProviderResponse: boolean;
  maxVariants: number;
  perGenerationTokenLimit: number | null;
};
