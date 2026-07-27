/**
 * Phase 21K — AI generation constants and enums.
 */

export const AI_GENERATION_TYPES = [
  "subject_line",
  "preview_text",
  "email_body",
  "email_rewrite",
  "follow_up_email",
  "sequence_draft",
  "reply_draft",
  "reply_classification",
  "campaign_summary",
  "recipient_summary",
  "next_best_action",
  "performance_insight",
  "template_improvement",
  "tone_change",
  "translation",
  "personalization_suggestion",
  "objection_response",
  "meeting_follow_up",
  "breakup_email",
] as const;

export type AIGenerationType = (typeof AI_GENERATION_TYPES)[number];

export const AI_GENERATION_TYPE_LABELS: Record<AIGenerationType, string> = {
  subject_line: "Subject line",
  preview_text: "Preview text",
  email_body: "Email body",
  email_rewrite: "Rewrite",
  follow_up_email: "Follow-up",
  sequence_draft: "Sequence draft",
  reply_draft: "Reply draft",
  reply_classification: "Reply classification",
  campaign_summary: "Campaign summary",
  recipient_summary: "Recipient summary",
  next_best_action: "Next best action",
  performance_insight: "Performance insight",
  template_improvement: "Template improvement",
  tone_change: "Tone change",
  translation: "Translation",
  personalization_suggestion: "Personalization suggestion",
  objection_response: "Objection response",
  meeting_follow_up: "Meeting follow-up",
  breakup_email: "Breakup email",
};

export const AI_TONES = [
  "professional",
  "friendly",
  "direct",
  "consultative",
  "concise",
  "warm",
  "formal",
  "informal",
  "educational",
  "confident",
  "neutral",
  "empathetic",
] as const;

export type AITone = (typeof AI_TONES)[number];

export const AI_REWRITE_OPS = [
  "shorten",
  "expand",
  "simplify",
  "make_more_formal",
  "make_more_friendly",
  "make_more_direct",
  "make_more_consultative",
  "reduce_sales_tone",
  "improve_clarity",
  "improve_grammar",
  "change_language",
  "change_reading_level",
  "remove_jargon",
  "strengthen_cta",
  "soften_cta",
  "convert_to_plain_text",
] as const;

export type AIRewriteOp = (typeof AI_REWRITE_OPS)[number];

export const AI_REPLY_CLASSIFICATIONS = [
  "positive",
  "negative",
  "neutral",
  "question",
  "interested",
  "not_interested",
  "meeting_request",
  "referral",
  "wrong_person",
  "pricing_question",
  "product_question",
  "technical_question",
  "timing_objection",
  "budget_objection",
  "authority_objection",
  "competitor_mention",
  "out_of_office",
  "automatic_reply",
  "unsubscribe_request",
  "complaint_like",
  "unknown",
] as const;

export type AIReplyClassificationCode =
  (typeof AI_REPLY_CLASSIFICATIONS)[number];

export const AI_NEXT_ACTIONS = [
  "reply_manually",
  "send_meeting_link",
  "create_follow_up_task",
  "assign_account_owner",
  "pause_sequence",
  "stop_sequence",
  "update_lead_status",
  "move_opportunity",
  "request_more_information",
  "mark_not_interested",
  "suppress_recipient",
  "review_complaint",
  "wait",
  "no_action",
] as const;

export type AINextActionCode = (typeof AI_NEXT_ACTIONS)[number];

export const AI_FEEDBACK_CODES = [
  "useful",
  "not_useful",
  "too_long",
  "too_short",
  "wrong_tone",
  "incorrect",
  "unsafe",
  "too_generic",
  "good_personalization",
  "bad_personalization",
  "other",
] as const;

export type AIFeedbackCode = (typeof AI_FEEDBACK_CODES)[number];

export const AI_APPROVAL_STATES = [
  "generated",
  "needs_review",
  "approved",
  "rejected",
  "applied_to_draft",
  "archived",
] as const;

export type AIApprovalState = (typeof AI_APPROVAL_STATES)[number];

export const AI_CONFIDENCE_LEVELS = [
  "low",
  "medium",
  "high",
  "not_enough_data",
] as const;

export type AIConfidence = (typeof AI_CONFIDENCE_LEVELS)[number];

/** CRM / personalization fields AI may use when explicitly allowed. */
export const AI_ALLOWED_CONTEXT_FIELDS = [
  "contactFirstName",
  "contactLastName",
  "jobTitle",
  "companyName",
  "industry",
  "country",
  "language",
  "companySize",
  "leadSource",
  "leadStatus",
  "qualificationScore",
  "opportunityStage",
  "companyDescription",
  "productInterest",
  "priorCampaignActivitySummary",
  "priorReplySummary",
  "userApprovedNotes",
] as const;

export type AIAllowedContextField = (typeof AI_ALLOWED_CONTEXT_FIELDS)[number];

export const AI_SENSITIVE_FIELD_PATTERNS = [
  /health|medical|diagnos/i,
  /politic|party|election/i,
  /religion|faith|church/i,
  /race|ethnic|nationality/i,
  /sexual|orientation|lgbt/i,
  /hardship|debt|bankrupt|salary|income/i,
  /criminal|arrest|convict/i,
  /family|spouse|children|marital/i,
  /internal.?only|private.?note|ssn|passport/i,
] as const;

export const DEFAULT_AI_MODELS = [
  {
    id: "gpt-4.1-mini",
    provider: "openai" as const,
    structuredOutput: true,
    maxContext: 128000,
    maxOutput: 16384,
    costClass: "standard" as const,
    latencyClass: "fast" as const,
    status: "active" as const,
  },
  {
    id: "gpt-4.1",
    provider: "openai" as const,
    structuredOutput: true,
    maxContext: 128000,
    maxOutput: 32768,
    costClass: "expensive" as const,
    latencyClass: "medium" as const,
    status: "active" as const,
  },
] as const;

export function isAiGloballyEnabled(): boolean {
  return process.env.EMAIL_AI_ENABLED === "true";
}

export function getDefaultAiModel(): string {
  return process.env.EMAIL_AI_DEFAULT_MODEL?.trim() || "gpt-4.1-mini";
}

export function getAiProviderCode(): string {
  return process.env.EMAIL_AI_PROVIDER?.trim() || "openai";
}
