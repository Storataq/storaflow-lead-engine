/**
 * Google Maps result validator — soft-fails per row.
 */

import { isCountryCode } from "@/lib/international/countries";
import type {
  NormalizedBusinessResult,
  ValidationIssue,
  ValidationOutcome,
} from "@/lib/scraping/connectors/types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const PHONE_PATTERN = /^\+?[\d\s().-]{7,20}$/;

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function readRating(item: NormalizedBusinessResult): number | null {
  const raw = item.rawData.rating;
  return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
}

export function validateGoogleMapsResult(
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

  for (const phone of item.phones) {
    if (!PHONE_PATTERN.test(phone)) {
      issues.push({
        sourceId: item.sourceId,
        field: "phones",
        message: `Ongeldig telefoonnummer: ${phone}`,
      });
    }
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

  const rating = readRating(item);
  if (rating != null && (rating < 0 || rating > 5)) {
    issues.push({
      sourceId: item.sourceId,
      field: "rating",
      message: "Rating moet tussen 0 en 5 liggen",
    });
  }

  if (item.confidence < 0 || item.confidence > 1) {
    issues.push({
      sourceId: item.sourceId,
      field: "confidence",
      message: "Confidence moet tussen 0 en 1 liggen",
    });
  }

  if (
    item.latitude == null ||
    !Number.isFinite(item.latitude) ||
    item.latitude < -90 ||
    item.latitude > 90
  ) {
    issues.push({
      sourceId: item.sourceId,
      field: "latitude",
      message: "Latitude ontbreekt of is ongeldig",
    });
  }

  if (
    item.longitude == null ||
    !Number.isFinite(item.longitude) ||
    item.longitude < -180 ||
    item.longitude > 180
  ) {
    issues.push({
      sourceId: item.sourceId,
      field: "longitude",
      message: "Longitude ontbreekt of is ongeldig",
    });
  }

  return issues;
}

export function validateGoogleMapsResults(
  items: NormalizedBusinessResult[],
): ValidationOutcome {
  const valid: NormalizedBusinessResult[] = [];
  const invalid: NormalizedBusinessResult[] = [];
  const issues: ValidationIssue[] = [];

  for (const item of items) {
    const itemIssues = validateGoogleMapsResult(item);
    if (itemIssues.length > 0) {
      invalid.push(item);
      issues.push(...itemIssues);
      continue;
    }
    valid.push(item);
  }

  return { valid, invalid, issues };
}
