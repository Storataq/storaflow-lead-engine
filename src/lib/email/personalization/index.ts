/**
 * Personalization engine with fallbacks (Phase 21B).
 * Extends foundation merge-field helpers — still no AI / no send.
 */

import type { PersonalizationContext } from "@/lib/email/interfaces";
import { DEFAULT_VARIABLE_FALLBACKS } from "@/lib/email/template/constants";
import {
  VARIABLE_PATTERN,
  extractUniqueVariables,
} from "@/lib/email/template/variables";
import { KNOWN_TEMPLATE_VARIABLES } from "@/lib/email/template/variables";

export {
  KNOWN_TEMPLATE_VARIABLES as KNOWN_PERSONALIZATION_VARIABLES,
  extractUniqueVariables as extractTemplateVariables,
};

export type PersonalizeOptions = {
  fallbacks?: Record<string, string>;
  /** When true, missing values use fallback or empty — never leave {{var}} */
  useFallbacks?: boolean;
  formatters?: Record<string, (value: string) => string>;
};

function defaultCurrentDate(): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
  }).format(new Date());
}

export function buildPersonalizationContext(
  input: PersonalizationContext,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    out[key] = value?.toString().trim() ?? "";
  }
  if (!out.currentDate) {
    out.currentDate = defaultCurrentDate();
  }
  return out;
}

function resolveContextValue(
  key: string,
  context: Record<string, string>,
): string {
  if (Object.prototype.hasOwnProperty.call(context, key)) {
    return context[key] ?? "";
  }
  // Nested path support: a.b.c → walk dotted keys if present as flat "a.b.c"
  // or as stepwise prefixes already flattened into context.
  return "";
}

/**
 * Supports {{var}}, nested paths {{a.b}}, helpers {{var|upper|lower|trim}},
 * and nested placeholders inside resolved values (up to 3 passes).
 */
export function applyPersonalization(
  template: string,
  context: Record<string, string>,
  options: PersonalizeOptions = {},
): string {
  const useFallbacks = options.useFallbacks !== false;
  const fallbacks = {
    ...DEFAULT_VARIABLE_FALLBACKS,
    ...options.fallbacks,
  };
  const formatters = options.formatters ?? {};

  const replaceOnce = (input: string): string =>
    input.replace(
      /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z][a-zA-Z0-9_]*)*)(?:\|([a-zA-Z]+))?\s*\}\}/g,
      (_, key: string, helper?: string) => {
        let value = resolveContextValue(key, context);
        if (!value && useFallbacks) {
          value = fallbacks[key] ?? "";
        }
        if (!value && !useFallbacks) {
          return `{{${key}}}`;
        }
        if (helper === "upper") value = value.toUpperCase();
        if (helper === "lower") value = value.toLowerCase();
        if (helper === "trim") value = value.trim();
        if (helper && formatters[helper]) {
          value = formatters[helper](value);
        }
        return value;
      },
    );

  let result = template;
  for (let pass = 0; pass < 3; pass += 1) {
    const next = replaceOnce(result);
    if (next === result) break;
    result = next;
  }
  // Never leave broken placeholders visible when fallbacks are on
  if (useFallbacks) {
    result = result.replace(
      /\{\{\s*[a-zA-Z][a-zA-Z0-9_.]*(?:\|[a-zA-Z]+)?\s*\}\}/g,
      "",
    );
  }
  return result;
}

export function resolveMissingVariables(
  templateParts: string[],
  context: Record<string, string>,
  fallbacks: Record<string, string> = DEFAULT_VARIABLE_FALLBACKS,
): string[] {
  const used = extractUniqueVariables(...templateParts);
  return used.filter((name) => {
    const raw = context[name]?.trim() ?? "";
    const fallback = fallbacks[name] ?? "";
    return !raw && !fallback;
  });
}

export const personalizationEngine = {
  buildContext: buildPersonalizationContext,
  apply: (template: string, context: Record<string, string>) =>
    applyPersonalization(template, context, { useFallbacks: true }),
  listKnownVariables: () => [...KNOWN_TEMPLATE_VARIABLES],
};

// Keep VARIABLE_PATTERN export for older imports
export { VARIABLE_PATTERN };
