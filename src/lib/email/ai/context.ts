/**
 * Phase 21K — data-minimizing AI context builder.
 */

import {
  AI_ALLOWED_CONTEXT_FIELDS,
  type AITone,
} from "@/lib/email/ai/constants";
import { filterAllowedCrmFields } from "@/lib/email/ai/safety";
import type { AIGenerationContext } from "@/lib/email/ai/types";
import { KNOWN_TEMPLATE_VARIABLES } from "@/lib/email/template/variables";

export type BuildAIContextInput = {
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
  crmFields?: Record<string, unknown>;
  analyticsSummary?: Record<string, unknown>;
  replyText?: string;
  forbiddenClaims?: string[];
  complianceNotes?: string[];
  useMinimalContext?: boolean;
  useReplyContent?: boolean;
  useAnalytics?: boolean;
  maxBodyChars?: number;
  maxReplyChars?: number;
};

export function buildAIContext(input: BuildAIContextInput): AIGenerationContext {
  const maxBody = input.maxBodyChars ?? 8000;
  const maxReply = input.maxReplyChars ?? 2000;
  const sources: string[] = ["organization", "user_request"];
  let truncated = false;
  const truncationNotes: string[] = [];

  const { fields, redacted } = filterAllowedCrmFields(
    input.crmFields ?? {},
    AI_ALLOWED_CONTEXT_FIELDS,
  );
  if (Object.keys(fields).length) sources.push("approved_crm_fields");
  if (redacted.length) {
    truncationNotes.push(`Redacted fields: ${redacted.join(", ")}`);
  }

  let body = input.existingBody ?? "";
  if (body.length > maxBody) {
    body = body.slice(0, maxBody);
    truncated = true;
    truncationNotes.push("Existing body truncated.");
  }

  let replyText: string | undefined;
  if (input.useReplyContent && input.replyText) {
    replyText =
      input.replyText.length > maxReply
        ? input.replyText.slice(0, maxReply)
        : input.replyText;
    if ((input.replyText?.length ?? 0) > maxReply) {
      truncated = true;
      truncationNotes.push("Reply content truncated.");
    }
    sources.push("reply_content");
  }

  let analyticsSummary: Record<string, unknown> | undefined;
  if (input.useAnalytics && input.analyticsSummary) {
    analyticsSummary = input.analyticsSummary;
    sources.push("analytics_summary");
  }

  if (input.brandVoiceSummary) sources.push("brand_voice");

  const complianceNotes = [
    ...(input.complianceNotes ?? []),
    "Do not fabricate facts, testimonials, statistics, or prior relationships.",
    "Do not use fake Re:/Fwd: prefixes or deceptive urgency.",
    "Only use registered personalization variables from the allowlist.",
    "Human review is required before sending or activating content.",
    "Never claim AI can guarantee deliverability or performance.",
  ];

  if (!complianceNotes.some((n) => /unsubscribe/i.test(n))) {
    complianceNotes.push(
      "Preserve unsubscribe / preference-center requirements when producing full emails.",
    );
  }

  return {
    organizationId: input.organizationId,
    userId: input.userId,
    language: input.language ?? "en",
    tone: input.tone,
    brandVoiceSummary: input.brandVoiceSummary,
    campaignPurpose: input.campaignPurpose,
    communicationCategory: input.communicationCategory,
    audienceSummary: input.audienceSummary,
    offer: input.offer,
    callToAction: input.callToAction,
    existingSubject: input.existingSubject,
    existingPreview: input.existingPreview,
    existingBody: body || undefined,
    rewriteOp: input.rewriteOp,
    targetLanguage: input.targetLanguage,
    allowedVariables: [...KNOWN_TEMPLATE_VARIABLES],
    crmFields: input.useMinimalContext === false ? fields : pickMinimal(fields),
    analyticsSummary,
    replyText,
    complianceNotes,
    forbiddenClaims: input.forbiddenClaims ?? [],
    truncated,
    truncationNotes: truncationNotes.length
      ? truncationNotes.join(" ")
      : undefined,
    sources,
  };
}

function pickMinimal(fields: Record<string, string>): Record<string, string> {
  const keep = [
    "contactFirstName",
    "companyName",
    "jobTitle",
    "industry",
    "country",
  ];
  const out: Record<string, string> = {};
  for (const key of keep) {
    if (fields[key]) out[key] = fields[key];
  }
  return out;
}

export function contextManifestFrom(context: AIGenerationContext) {
  return {
    sources: context.sources,
    allowedFields: Object.keys(context.crmFields),
    truncated: context.truncated,
    truncationNotes: context.truncationNotes ?? null,
    hasReply: Boolean(context.replyText),
    hasAnalytics: Boolean(context.analyticsSummary),
  };
}
