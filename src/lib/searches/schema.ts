import { z } from "zod";

import { COMPANY_SIZE_OPTIONS } from "@/lib/searches/constants";

const companySizeValues = COMPANY_SIZE_OPTIONS.map((item) => item.value) as [
  "1-10",
  "11-50",
  "51-250",
  "250+",
];

export const searchQueryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Naam is verplicht (minimaal 2 tekens)")
    .max(120, "Naam is te lang"),
  countries: z
    .array(z.string().trim().min(1))
    .min(1, "Selecteer minimaal één land"),
  industries: z.array(z.string().trim().min(1)).default([]),
  keywords: z
    .array(z.string().trim().min(1))
    .min(1, "Voer minimaal één keyword in"),
  company_size: z.enum(companySizeValues).optional().nullable(),
  website_required: z.boolean().default(false),
  linkedin_required: z.boolean().default(false),
  status: z.enum(["active", "paused", "draft"]),
});

export type SearchQueryFormValues = z.infer<typeof searchQueryFormSchema>;

export function parseKeywordsFromTextarea(value: string): string[] {
  return value
    .split(/[\n,;]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}
