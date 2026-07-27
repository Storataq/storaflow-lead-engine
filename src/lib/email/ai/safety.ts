/**
 * Phase 21K — content safety + personalization variable validation.
 */

import {
  AI_SENSITIVE_FIELD_PATTERNS,
  type AIAllowedContextField,
  AI_ALLOWED_CONTEXT_FIELDS,
} from "@/lib/email/ai/constants";
import { KNOWN_TEMPLATE_VARIABLES } from "@/lib/email/template/variables";
import { VARIABLE_PATTERN } from "@/lib/email/template/variables";

export type SafetyFlag = {
  code: string;
  severity: "warning" | "block";
  message: string;
};

const DECEPTIVE_PATTERNS = [
  /\bre:\s/i,
  /\bfwd:\s/i,
  /\burgent[!!]{2,}/i,
  /\bact\s+now[!]/i,
  /\blimited\s+time\s+only[!]/i,
  /\bguarantee[sd]?\s+(results?|income|revenue)\b/i,
  /\b\d{2,3}%\s+(increase|growth|roi)\b/i,
];

const SPAMMY_PATTERNS = [
  /FREE!!!/i,
  /\$\$\$/,
  /click\s+here\s+now!!!/i,
  /[A-Z]{8,}/,
];

export function filterAllowedCrmFields(
  input: Record<string, unknown>,
  allowlist: readonly string[] = AI_ALLOWED_CONTEXT_FIELDS,
): { fields: Record<string, string>; redacted: string[] } {
  const fields: Record<string, string> = {};
  const redacted: string[] = [];
  const allowed = new Set(allowlist);

  for (const [key, value] of Object.entries(input)) {
    if (!allowed.has(key as AIAllowedContextField)) {
      redacted.push(key);
      continue;
    }
    if (typeof value !== "string" && typeof value !== "number") {
      redacted.push(key);
      continue;
    }
    const text = String(value).trim();
    if (!text) continue;
    if (AI_SENSITIVE_FIELD_PATTERNS.some((p) => p.test(key) || p.test(text))) {
      redacted.push(key);
      continue;
    }
    fields[key] = text.slice(0, 500);
  }

  return { fields, redacted };
}

export function extractTemplateVariables(content: string): string[] {
  const found = new Set<string>();
  const re = new RegExp(VARIABLE_PATTERN.source, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    found.add(match[1].split("|")[0]);
  }
  return [...found];
}

export function validateGeneratedVariables(
  contents: string[],
  allowedVariables: readonly string[] = KNOWN_TEMPLATE_VARIABLES,
): SafetyFlag[] {
  const flags: SafetyFlag[] = [];
  const allowed = new Set(allowedVariables);
  for (const content of contents) {
    for (const variable of extractTemplateVariables(content)) {
      if (!allowed.has(variable)) {
        flags.push({
          code: "unknown_variable",
          severity: "block",
          message: `Generated content uses unregistered variable {{${variable}}}.`,
        });
      }
    }
  }
  return flags;
}

export function validateGeneratedContent(input: {
  subject?: string | null;
  previewText?: string | null;
  body?: string | null;
  plainText?: string | null;
}): SafetyFlag[] {
  const flags: SafetyFlag[] = [];
  const blobs = [
    input.subject,
    input.previewText,
    input.body,
    input.plainText,
  ].filter(Boolean) as string[];

  for (const text of blobs) {
    for (const pattern of DECEPTIVE_PATTERNS) {
      if (pattern.test(text)) {
        flags.push({
          code: "deceptive_language",
          severity: "block",
          message: "Content may use deceptive urgency, fake reply prefixes, or unsupported claims.",
        });
        break;
      }
    }
    for (const pattern of SPAMMY_PATTERNS) {
      if (pattern.test(text)) {
        flags.push({
          code: "spam_like_formatting",
          severity: "warning",
          message: "Content has spam-like formatting (caps, punctuation, or bait phrases).",
        });
        break;
      }
    }
    if (
      /\b(testimonial|case study)\b/i.test(text) &&
      /\b\d+%\b/.test(text) &&
      !/\{\{/.test(text)
    ) {
      flags.push({
        code: "possible_fabricated_stat",
        severity: "warning",
        message:
          "Content may include statistics or testimonials that were not provided in context.",
      });
    }
  }

  if (input.subject && input.previewText) {
    const subj = input.subject.trim().toLowerCase();
    const prev = input.previewText.trim().toLowerCase();
    if (subj && prev && subj === prev) {
      flags.push({
        code: "preview_repeats_subject",
        severity: "warning",
        message: "Preview text repeats the subject verbatim.",
      });
    }
  }

  flags.push(
    ...validateGeneratedVariables(blobs),
  );

  return dedupeFlags(flags);
}

function dedupeFlags(flags: SafetyFlag[]): SafetyFlag[] {
  const seen = new Set<string>();
  return flags.filter((f) => {
    const key = `${f.code}:${f.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function isHighImpactReplyClassification(code: string | null | undefined): boolean {
  if (!code) return false;
  return [
    "unsubscribe_request",
    "complaint_like",
    "not_interested",
  ].includes(code);
}
