/**
 * Parser — converts connector hits into a uniform pre-normalize shape.
 * Individually testable; no network.
 */

import type {
  ConnectorSearchHit,
  NormalizedBusinessResult,
} from "@/lib/scraping/connectors/types";

function asStringArray(
  values: string[] | undefined,
  legacy: string | null | undefined,
): string[] {
  if (values?.length) {
    return values.filter((item) => typeof item === "string");
  }
  if (legacy && legacy.trim()) {
    return [legacy];
  }
  return [];
}

/**
 * Parses raw connector hits into a loose NormalizedBusinessResult shape.
 * Does not validate or fully normalize — that is the next pipeline steps.
 */
export function parseSearchHits(
  source: string,
  hits: ConnectorSearchHit[],
): NormalizedBusinessResult[] {
  return hits.map((hit, index) => {
    const sourceId =
      hit.sourceId?.trim() ||
      `${source}:${index + 1}:${hit.sourceUrl}`;

    return {
      source,
      sourceId,
      name: hit.name ?? "",
      website: hit.website ?? null,
      emails: asStringArray(hit.emails, hit.email),
      phones: asStringArray(hit.phones, hit.phone),
      street: hit.street ?? null,
      postalCode: hit.postalCode ?? null,
      city: hit.city ?? null,
      region: hit.region ?? null,
      countryCode: hit.countryCode ?? hit.country ?? null,
      industry: hit.industry ?? null,
      categories: hit.categories ? [...hit.categories] : [],
      description: hit.description ?? null,
      latitude: hit.latitude ?? null,
      longitude: hit.longitude ?? null,
      confidence:
        typeof hit.confidence === "number" && Number.isFinite(hit.confidence)
          ? hit.confidence
          : 0.5,
      rawData: {
        ...(hit.raw ?? {}),
        sourceUrl: hit.sourceUrl,
      },
    };
  });
}

/**
 * Parses already-shaped connector search results (pass-through parse).
 */
export function parseSearchResults(
  results: NormalizedBusinessResult[],
): NormalizedBusinessResult[] {
  return results.map((item) => ({
    ...item,
    emails: [...item.emails],
    phones: [...item.phones],
    categories: [...item.categories],
    rawData: { ...item.rawData },
  }));
}
