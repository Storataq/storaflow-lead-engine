/**
 * Phase 21K — versioned system prompt templates (in-code defaults).
 * Organization overrides can be stored in email_ai_prompt_* tables later.
 */

import type { AIGenerationType } from "@/lib/email/ai/constants";
import type { AIGenerationContext } from "@/lib/email/ai/types";

export const PROMPT_VERSION = 1;

const BASE_SYSTEM = `You are an email writing assistant for Storaflow, a B2B AI lead engine with CRM and email automation.
You assist humans. You never send email, launch campaigns, activate sequences, or remove suppressions.
Rules:
- Output valid JSON only matching the requested schema.
- Do not fabricate facts, customers, statistics, testimonials, or prior contact.
- Do not use fake Re:/Fwd: prefixes or deceptive urgency.
- Only use personalization variables from the provided allowlist, using {{variableName}} syntax.
- Prefer clear paragraphs and one primary CTA.
- Flag assumptions and missing context.
- Do not claim one variant will definitely perform better.
- Respect brand voice and tone when provided.
- English or Dutch as requested; do not mix languages unless translating.`;

export function buildSystemPrompt(generationType: AIGenerationType): string {
  return `${BASE_SYSTEM}\nGeneration type: ${generationType}.\nPrompt version: ${PROMPT_VERSION}.`;
}

export function buildUserPrompt(
  generationType: AIGenerationType,
  context: AIGenerationContext,
  extras?: Record<string, unknown>,
): string {
  const payload = {
    task: generationType,
    language: context.language,
    tone: context.tone,
    brandVoice: context.brandVoiceSummary ?? null,
    campaignPurpose: context.campaignPurpose ?? null,
    communicationCategory: context.communicationCategory ?? null,
    audience: context.audienceSummary ?? null,
    offer: context.offer ?? null,
    callToAction: context.callToAction ?? null,
    existing: {
      subject: context.existingSubject ?? null,
      previewText: context.existingPreview ?? null,
      body: context.existingBody ?? null,
    },
    rewriteOp: context.rewriteOp ?? null,
    targetLanguage: context.targetLanguage ?? null,
    allowedVariables: context.allowedVariables,
    crmFields: context.crmFields,
    analyticsSummary: context.analyticsSummary ?? null,
    replyText: context.replyText ?? null,
    complianceNotes: context.complianceNotes,
    forbiddenClaims: context.forbiddenClaims,
    truncated: context.truncated,
    extras: extras ?? {},
    outputSchemaHint: schemaHint(generationType),
  };

  return JSON.stringify(payload, null, 2);
}

function schemaHint(type: AIGenerationType): string {
  switch (type) {
    case "subject_line":
      return `{ "variants": [{ "subject": "", "style": "", "estimatedIntent": "", "personalizationVars": [], "warnings": [], "assumptions": [] }], "confidence": "low|medium|high|not_enough_data" }`;
    case "preview_text":
      return `{ "variants": [{ "previewText": "", "warnings": [], "assumptions": [] }], "confidence": "..." }`;
    case "email_body":
    case "email_rewrite":
    case "follow_up_email":
    case "tone_change":
    case "translation":
    case "breakup_email":
    case "meeting_follow_up":
    case "objection_response":
    case "reply_draft":
    case "template_improvement":
      return `{ "variants": [{ "subject": "", "previewText": "", "plainText": "", "htmlBody": "", "cta": "", "personalizationVars": [], "warnings": [], "assumptions": [] }], "confidence": "...", "issues": [] }`;
    case "sequence_draft":
      return `{ "name": "", "description": "", "steps": [{ "stepNumber": 1, "stepType": "email|wait|manual_task", "waitDays": 0, "subject": "", "plainText": "", "notes": "" }], "stopRules": [], "assumptions": [], "risks": [], "missingContext": [], "confidence": "..." }`;
    case "reply_classification":
      return `{ "classification": "positive|negative|...", "confidence": "...", "explanation": "", "evidenceSnippets": [], "requiresManualReview": true, "nextActions": [{ "actionCode": "reply_manually", "reason": "", "confidence": "medium" }] }`;
    case "campaign_summary":
    case "performance_insight":
    case "recipient_summary":
      return `{ "title": "", "summary": "", "importantChanges": [], "risks": [], "opportunities": [], "dataQualityWarnings": [], "confidence": "...", "causationClaimed": false }`;
    case "next_best_action":
      return `{ "actions": [{ "actionCode": "wait", "reason": "", "confidence": "medium", "humanApprovalRequired": true, "evidence": [] }] }`;
    case "personalization_suggestion":
      return `{ "suggestions": [{ "variable": "", "reason": "", "example": "" }], "warnings": [], "confidence": "..." }`;
    default:
      return `{ "variants": [], "confidence": "low" }`;
  }
}
