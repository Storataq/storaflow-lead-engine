/**
 * Validator — soft-fails per result; never throws for a single bad row.
 */

import { isCountryCode } from "@/lib/international/countries";
import type {
  NormalizedBusinessResult,
  ValidationIssue,
  ValidationOutcome,
} from "@/lib/scraping/connectors/types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateBusinessResult(
  item: NormalizedBusinessResult,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!item.name.trim()) {
    issues.push({
      sourceId: item.sourceId,
      field: "name",
      message: "Bedrijfsnaam is verplicht",
    });
  }

  if (!item.countryCode || !isCountryCode(item.countryCode)) {
    issues.push({
      sourceId: item.sourceId,
      field: "countryCode",
      message: "Ongeldige of ontbrekende ISO-landcode",
    });
  }

  if (item.website && !isValidHttpUrl(item.website)) {
    issues.push({
      sourceId: item.sourceId,
      field: "website",
      message: "Website is geen geldige URL",
    });
  }

  for (const email of item.emails) {
    if (!EMAIL_PATTERN.test(email)) {
      issues.push({
        sourceId: item.sourceId,
        field: "emails",
        message: `Ongeldig e-mailadres: ${email}`,
      });
    }
  }

  if (item.confidence < 0 || item.confidence > 1) {
    issues.push({
      sourceId: item.sourceId,
      field: "confidence",
      message: "Confidence moet tussen 0 en 1 liggen",
    });
  }

  return issues;
}

export function validateBusinessResults(
  items: NormalizedBusinessResult[],
): ValidationOutcome {
  const valid: NormalizedBusinessResult[] = [];
  const invalid: NormalizedBusinessResult[] = [];
  const issues: ValidationIssue[] = [];

  for (const item of items) {
    const itemIssues = validateBusinessResult(item);
    if (itemIssues.length > 0) {
      invalid.push(item);
      issues.push(...itemIssues);
      continue;
    }
    valid.push(item);
  }

  return { valid, invalid, issues };
}
