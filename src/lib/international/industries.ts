import type { IndustryRecord } from "@/lib/international/types";

/**
 * Stable industry taxonomy (English labels).
 * Codes are locale-independent keys suitable for scraping filters later.
 */
export const INDUSTRIES: IndustryRecord[] = [
  { code: "agriculture", labelEn: "Agriculture" },
  { code: "mining", labelEn: "Mining & quarrying" },
  { code: "manufacturing", labelEn: "Manufacturing" },
  { code: "utilities", labelEn: "Utilities" },
  { code: "construction", labelEn: "Construction" },
  { code: "wholesale", labelEn: "Wholesale trade" },
  { code: "retail", labelEn: "Retail" },
  { code: "transport_logistics", labelEn: "Transport & logistics" },
  { code: "hospitality", labelEn: "Hospitality & food service" },
  { code: "information_tech", labelEn: "Information technology" },
  { code: "telecommunications", labelEn: "Telecommunications" },
  { code: "media", labelEn: "Media & publishing" },
  { code: "finance", labelEn: "Finance & insurance" },
  { code: "real_estate", labelEn: "Real estate" },
  { code: "professional_services", labelEn: "Professional services" },
  { code: "administrative_services", labelEn: "Administrative services" },
  { code: "education", labelEn: "Education" },
  { code: "healthcare", labelEn: "Healthcare" },
  { code: "arts_entertainment", labelEn: "Arts & entertainment" },
  { code: "automotive", labelEn: "Automotive" },
  { code: "energy", labelEn: "Energy" },
  { code: "nonprofit", labelEn: "Nonprofit" },
  { code: "public_sector", labelEn: "Public sector" },
  { code: "other", labelEn: "Other" },
];

export const INDUSTRY_BY_CODE: Record<string, IndustryRecord> = Object.fromEntries(
  INDUSTRIES.map((industry) => [industry.code, industry]),
);

export function isIndustryCode(value: string): boolean {
  return Object.prototype.hasOwnProperty.call(INDUSTRY_BY_CODE, value);
}
