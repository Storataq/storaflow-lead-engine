/**
 * Deduplicator — keeps the best record by confidence + completeness.
 */

import {
  normalizeCompanyName,
  normalizeDomain,
} from "@/lib/scraping/connectors/pipeline/normalizer";
import type {
  DeduplicationOutcome,
  NormalizedBusinessResult,
} from "@/lib/scraping/connectors/types";

function completenessScore(item: NormalizedBusinessResult): number {
  let score = 0;
  if (item.website) score += 2;
  if (item.emails.length) score += 2;
  if (item.phones.length) score += 1;
  if (item.street) score += 1;
  if (item.postalCode) score += 1;
  if (item.city) score += 1;
  if (item.region) score += 1;
  if (item.countryCode) score += 1;
  if (item.industry) score += 1;
  if (item.categories.length) score += 1;
  if (item.description) score += 1;
  if (item.latitude != null && item.longitude != null) score += 1;
  return score;
}

function isBetter(
  candidate: NormalizedBusinessResult,
  current: NormalizedBusinessResult,
): boolean {
  if (candidate.confidence !== current.confidence) {
    return candidate.confidence > current.confidence;
  }
  return completenessScore(candidate) > completenessScore(current);
}

function sourceKey(item: NormalizedBusinessResult): string {
  return `${item.source.toLowerCase()}|${item.sourceId.toLowerCase()}`;
}

function domainKey(item: NormalizedBusinessResult): string | null {
  const domain = normalizeDomain(item.website);
  return domain ? `domain|${domain}` : null;
}

function nameCityKey(item: NormalizedBusinessResult): string | null {
  const name = normalizeCompanyName(item.name);
  const city = (item.city ?? "").trim().toLowerCase();
  if (!name || !city) return null;
  return `name-city|${name}|${city}`;
}

/**
 * Removes duplicates by:
 * 1. source + sourceId
 * 2. normalized domain
 * 3. normalized company name + city
 */
export function deduplicateBusinessResults(
  items: NormalizedBusinessResult[],
): DeduplicationOutcome {
  const winners = new Map<string, NormalizedBusinessResult>();
  const keyOwners = new Map<string, string>();

  let duplicatesRemoved = 0;

  for (const item of items) {
    const keys = [
      sourceKey(item),
      domainKey(item),
      nameCityKey(item),
    ].filter((key): key is string => Boolean(key));

    const conflictIds = new Set<string>();
    for (const key of keys) {
      const ownerId = keyOwners.get(key);
      if (ownerId) conflictIds.add(ownerId);
    }

    if (conflictIds.size === 0) {
      const id = sourceKey(item);
      winners.set(id, item);
      for (const key of keys) {
        keyOwners.set(key, id);
      }
      continue;
    }

    // Merge against the strongest existing conflict winner.
    let bestId: string | null = null;
    let best: NormalizedBusinessResult | null = null;
    for (const id of conflictIds) {
      const existing = winners.get(id);
      if (!existing) continue;
      if (!best || isBetter(existing, best)) {
        best = existing;
        bestId = id;
      }
    }

    if (!best || !bestId) {
      const id = sourceKey(item);
      winners.set(id, item);
      for (const key of keys) {
        keyOwners.set(key, id);
      }
      continue;
    }

    duplicatesRemoved += 1;

    if (isBetter(item, best)) {
      winners.delete(bestId);
      // Drop stale key ownership pointing at the replaced winner.
      for (const [key, ownerId] of keyOwners) {
        if (ownerId === bestId) {
          keyOwners.delete(key);
        }
      }
      const id = sourceKey(item);
      winners.set(id, item);
      for (const key of keys) {
        keyOwners.set(key, id);
      }
    }
  }

  return {
    results: [...winners.values()],
    duplicatesRemoved,
  };
}
