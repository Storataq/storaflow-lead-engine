/**
 * Template render + preview + full validation (Phase 21B).
 */

import { htmlToPlainText, sanitizeEmailHtml, validateEmailHtml } from "@/lib/email/template/html";
import {
  applyPersonalization,
  buildPersonalizationContext,
  resolveMissingVariables,
} from "@/lib/email/personalization";
import {
  validateTemplateVariables,
  type VariableValidationIssue,
} from "@/lib/email/template/variables";
import type { HtmlValidationIssue } from "@/lib/email/template/html";
import type { PersonalizationContext } from "@/lib/email/interfaces";
import { DEFAULT_VARIABLE_FALLBACKS } from "@/lib/email/template/constants";
import { extractUniqueVariables } from "@/lib/email/template/variables";

export type TemplateContent = {
  subject: string;
  previewText?: string | null;
  htmlBody: string;
  textBody?: string | null;
  fallbacks?: Record<string, string>;
};

export type TemplateValidationResult = {
  ok: boolean;
  variables: string[];
  variableIssues: VariableValidationIssue[];
  htmlIssues: HtmlValidationIssue[];
  sanitizedHtml: string;
  plainText: string;
};

export type TemplatePreviewResult = {
  subject: string;
  previewText: string;
  htmlBody: string;
  textBody: string;
  missingVariables: string[];
  warnings: string[];
  usedVariables: string[];
};

export function collectTemplateVariables(template: TemplateContent): string[] {
  return extractUniqueVariables(
    template.subject,
    template.previewText ?? "",
    template.htmlBody,
    template.textBody ?? "",
  );
}

export function validateTemplateContent(
  template: TemplateContent,
): TemplateValidationResult {
  const sanitizedHtml = sanitizeEmailHtml(template.htmlBody);
  const variableResult = validateTemplateVariables({
    subject: template.subject,
    previewText: template.previewText,
    htmlBody: sanitizedHtml,
    textBody: template.textBody,
  });
  const htmlIssues = validateEmailHtml(template.htmlBody);
  const plainText =
    template.textBody?.trim() || htmlToPlainText(sanitizedHtml);

  return {
    ok:
      variableResult.ok &&
      !htmlIssues.some((issue) => issue.severity === "error"),
    variables: variableResult.variables,
    variableIssues: variableResult.issues,
    htmlIssues,
    sanitizedHtml,
    plainText,
  };
}

export function renderEmailTemplate(
  template: TemplateContent,
  variables: Record<string, string | null | undefined>,
  options?: { useFallbacks?: boolean },
): { subject: string; htmlBody: string; textBody: string | null } {
  const context: Record<string, string> = {};
  for (const [key, value] of Object.entries(variables)) {
    context[key] = value?.toString() ?? "";
  }
  const fallbacks = {
    ...DEFAULT_VARIABLE_FALLBACKS,
    ...template.fallbacks,
  };
  const useFallbacks = options?.useFallbacks !== false;
  const html = sanitizeEmailHtml(template.htmlBody);

  return {
    subject: applyPersonalization(template.subject, context, {
      useFallbacks,
      fallbacks,
    }),
    htmlBody: applyPersonalization(html, context, { useFallbacks, fallbacks }),
    textBody: applyPersonalization(
      template.textBody?.trim() || htmlToPlainText(html),
      context,
      { useFallbacks, fallbacks },
    ),
  };
}

export function previewEmailTemplate(input: {
  template: TemplateContent;
  data: PersonalizationContext;
}): TemplatePreviewResult {
  const context = buildPersonalizationContext(input.data);
  const fallbacks = {
    ...DEFAULT_VARIABLE_FALLBACKS,
    ...input.template.fallbacks,
  };
  const validation = validateTemplateContent(input.template);
  const rendered = renderEmailTemplate(input.template, context, {
    useFallbacks: true,
  });
  const missing = resolveMissingVariables(
    [
      input.template.subject,
      input.template.previewText ?? "",
      input.template.htmlBody,
      input.template.textBody ?? "",
    ],
    context,
    fallbacks,
  );
  const warnings = [
    ...validation.variableIssues.map((i) => i.message),
    ...validation.htmlIssues.map((i) => i.message),
  ];
  if (missing.length) {
    warnings.push(
      `Missing data (using fallbacks where available): ${missing.join(", ")}`,
    );
  }

  return {
    subject: rendered.subject,
    previewText: applyPersonalization(
      input.template.previewText ?? "",
      context,
      { useFallbacks: true, fallbacks },
    ),
    htmlBody: rendered.htmlBody,
    textBody: rendered.textBody ?? "",
    missingVariables: missing,
    warnings,
    usedVariables: validation.variables,
  };
}

/** Resolve CRM-ish records into personalization context (integration prep). */
export function contextFromCrmLike(input: {
  companyName?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  industry?: string | null;
  city?: string | null;
  country?: string | null;
  description?: string | null;
  ownerName?: string | null;
  jobTitle?: string | null;
}): PersonalizationContext {
  const parts = (input.contactName ?? "").trim().split(/\s+/).filter(Boolean);
  return {
    companyName: input.companyName,
    contactFirstName: parts[0] ?? null,
    contactLastName: parts.length > 1 ? parts.slice(1).join(" ") : null,
    jobTitle: input.jobTitle,
    industry: input.industry,
    city: input.city,
    country: input.country,
    website: input.website,
    phone: input.phone,
    email: input.email,
    ownerName: input.ownerName,
    companyDescription: input.description,
    unsubscribeLink: "#",
  };
}
