/**
 * Phone discovery and light normalization.
 */

import type { PhoneCategory, PageType } from "@/lib/enrichment/types";

export function normalizePhone(raw: string): string {
  return raw.trim().replace(/[^\d+]/g, "");
}

export function extractPhonesFromText(text: string): string[] {
  const found = new Set<string>();
  const regex =
    /(?:\+|00)?[\d][\d\s()./-]{7,}[\d]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) {
    const value = match[0]?.trim() ?? "";
    const digits = value.replace(/\D/g, "");
    if (digits.length >= 8 && digits.length <= 15) {
      found.add(value);
    }
  }
  return [...found];
}

export function categorizePhone(
  value: string,
  pageType: PageType,
): PhoneCategory {
  const lower = value.toLowerCase();
  if (/fax/i.test(lower)) return "fax";
  if (pageType === "location") return "branch";
  if (pageType === "contact") return "main";
  return "unknown";
}

export function scorePhoneConfidence(input: {
  fromTelLink: boolean;
  pageType: PageType;
}): number {
  let score = 40;
  if (input.fromTelLink) score += 30;
  if (input.pageType === "contact") score += 20;
  if (input.pageType === "location") score += 10;
  return Math.min(100, score);
}
