import { z } from "zod";

import { isCountryCode } from "@/lib/international/countries";
import { isIndustryCode } from "@/lib/international/industries";
import { isLanguageCode } from "@/lib/international/languages";
import { isSourceCode } from "@/lib/international/sources";
import { COMPANY_SIZE_OPTIONS } from "@/lib/searches/constants";

const companySizeValues = COMPANY_SIZE_OPTIONS.map((item) => item.value) as [
  "1-10",
  "11-50",
  "51-250",
  "250+",
];

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

export const searchQueryFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Naam is verplicht (minimaal 2 tekens)")
      .max(120, "Naam is te lang"),
    search_prompt: z
      .string()
      .trim()
      .max(2000, "Search prompt is te lang")
      .optional()
      .nullable(),
    countries: z
      .array(
        z
          .string()
          .trim()
          .toUpperCase()
          .refine(isCountryCode, "Ongeldige landcode (gebruik ISO 3166-1)"),
      )
      .min(1, "Selecteer minimaal één land"),
    regions: z
      .array(z.string().trim().min(1).max(120))
      .max(50)
      .default([]),
    cities: z
      .array(z.string().trim().min(1).max(120))
      .max(100)
      .default([]),
    languages: z
      .array(
        z
          .string()
          .trim()
          .toLowerCase()
          .refine(isLanguageCode, "Ongeldige taalcode (gebruik ISO 639-1)"),
      )
      .default([]),
    industries: z
      .array(
        z
          .string()
          .trim()
          .refine(isIndustryCode, "Ongeldige branchecode"),
      )
      .default([]),
    sources: z
      .array(
        z
          .string()
          .trim()
          .refine(isSourceCode, "Ongeldige broncode"),
      )
      .default([]),
    keywords: z.array(z.string().trim().min(1).max(120)).default([]),
    company_size: z.enum(companySizeValues).optional().nullable(),
    website_required: z.boolean().default(false),
    linkedin_required: z.boolean().default(false),
    status: z.enum(["active", "paused", "draft"]),
  })
  .superRefine((data, ctx) => {
    const hasKeyword = data.keywords.length > 0;
    const hasIndustry = data.industries.length > 0;
    const hasPrompt = Boolean(data.search_prompt?.trim());
    if (!hasKeyword && !hasIndustry && !hasPrompt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["keywords"],
        message:
          "Vul minimaal één keyword, branche of AI Search Prompt in",
      });
    }
  });

export type SearchQueryFormValues = z.infer<typeof searchQueryFormSchema>;

export function parseListFromTextarea(value: string): string[] {
  return uniqueStrings(
    value.split(/[\n,;]+/).map((part) => part.trim()),
  );
}

export function parseListFromFormValues(values: string[]): string[] {
  return uniqueStrings(values);
}

/** @deprecated use parseListFromTextarea */
export function parseKeywordsFromTextarea(value: string): string[] {
  return parseListFromTextarea(value);
}

/** @deprecated use parseListFromTextarea */
export function parseRegionsFromTextarea(value: string): string[] {
  return parseListFromTextarea(value);
}
