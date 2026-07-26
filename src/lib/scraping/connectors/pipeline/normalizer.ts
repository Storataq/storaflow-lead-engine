/**
 * Normalizer — cleans and standardizes parsed business results.
 */

import type { NormalizedBusinessResult } from "@/lib/scraping/connectors/types";

function trimOrNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/**
 * Extracts a registrable-ish hostname from a website URL, without protocol.
 */
export function normalizeDomain(website: string | null): string | null {
  if (!website) return null;
  const trimmed = website.trim();
  if (!trimmed) return null;

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const host = new URL(withProtocol).hostname.toLowerCase();
    return host.replace(/^www\./, "") || null;
  } catch {
    return trimmed
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      ?.trim() || null;
  }
}

export function normalizeCompanyName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeBusinessResult(
  item: NormalizedBusinessResult,
): NormalizedBusinessResult {
  const website = trimOrNull(item.website);
  const countryCode = trimOrNull(item.countryCode)?.toUpperCase() ?? null;

  return {
    source: item.source.trim(),
    sourceId: item.sourceId.trim(),
    name: item.name.trim(),
    website,
    emails: item.emails
      .map(normalizeEmail)
      .filter((email) => email.length > 0),
    phones: item.phones
      .map(normalizePhone)
      .filter((phone) => phone.length > 0),
    street: trimOrNull(item.street),
    postalCode: trimOrNull(item.postalCode),
    city: trimOrNull(item.city),
    region: trimOrNull(item.region),
    countryCode,
    industry: trimOrNull(item.industry),
    categories: item.categories
      .map((category) => category.trim())
      .filter((category) => category.length > 0),
    description: trimOrNull(item.description),
    latitude:
      typeof item.latitude === "number" && Number.isFinite(item.latitude)
        ? item.latitude
        : null,
    longitude:
      typeof item.longitude === "number" && Number.isFinite(item.longitude)
        ? item.longitude
        : null,
    confidence:
      typeof item.confidence === "number" && Number.isFinite(item.confidence)
        ? item.confidence
        : 0,
    rawData: {
      ...item.rawData,
      normalizedDomain: normalizeDomain(website),
    },
  };
}

export function normalizeBusinessResults(
  items: NormalizedBusinessResult[],
): NormalizedBusinessResult[] {
  return items.map(normalizeBusinessResult);
}
