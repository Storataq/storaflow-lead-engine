/**
 * Maps Google Maps place payloads → NormalizedBusinessResult.
 */

import type { GoogleMapsPlace } from "@/lib/scraping/connectors/google-maps/types";
import type {
  ConnectorSearchHit,
  NormalizedBusinessResult,
} from "@/lib/scraping/connectors/types";

function confidenceFromPlace(place: GoogleMapsPlace): number {
  let score = 0.45;
  if (place.websiteUri) score += 0.15;
  if (place.internationalPhoneNumber || place.nationalPhoneNumber) {
    score += 0.1;
  }
  if (place.rating != null && place.rating >= 3.5) score += 0.1;
  if ((place.userRatingCount ?? 0) > 20) score += 0.1;
  if (place.latitude != null && place.longitude != null) score += 0.05;
  if (place.openingHours?.weekdayText?.length) score += 0.05;
  return Math.min(1, Number(score.toFixed(2)));
}

export function placeToSearchHit(place: GoogleMapsPlace): ConnectorSearchHit {
  const phones = [
    place.internationalPhoneNumber,
    place.nationalPhoneNumber,
  ].filter((value): value is string => Boolean(value?.trim()));

  return {
    sourceId: place.placeId,
    name: place.name,
    website: place.websiteUri ?? null,
    phones: [...new Set(phones)],
    emails: [],
    street: place.street ?? null,
    postalCode: place.postalCode ?? null,
    city: place.city,
    region: place.region ?? null,
    countryCode: place.countryCode,
    industry: place.primaryType ?? place.types[0] ?? null,
    categories: [...place.types],
    description: place.formattedAddress,
    latitude: place.latitude,
    longitude: place.longitude,
    confidence: confidenceFromPlace(place),
    sourceUrl: place.googleMapsUri,
    raw: {
      provider: "google_maps",
      placeId: place.placeId,
      rating: place.rating ?? null,
      userRatingCount: place.userRatingCount ?? 0,
      openingHours: place.openingHours ?? null,
      businessStatus: place.businessStatus ?? null,
      formattedAddress: place.formattedAddress,
      types: place.types,
    },
  };
}

export function normalizeGoogleMapsPlace(
  place: GoogleMapsPlace,
  source = "google_maps",
): NormalizedBusinessResult {
  const hit = placeToSearchHit(place);
  const phones = hit.phones ?? [];

  return {
    source,
    sourceId: hit.sourceId ?? place.placeId,
    name: (hit.name ?? "").trim(),
    website: hit.website?.trim() || null,
    emails: [],
    phones: phones.map((phone) => phone.trim()).filter(Boolean),
    street: hit.street?.trim() || null,
    postalCode: hit.postalCode?.trim() || null,
    city: hit.city?.trim() || null,
    region: hit.region?.trim() || null,
    countryCode: hit.countryCode?.trim().toUpperCase() || null,
    industry: hit.industry?.trim() || null,
    categories: (hit.categories ?? []).map((item) => item.trim()).filter(Boolean),
    description: hit.description?.trim() || null,
    latitude: hit.latitude ?? null,
    longitude: hit.longitude ?? null,
    confidence: hit.confidence ?? 0.5,
    rawData: {
      ...(hit.raw ?? {}),
      sourceUrl: hit.sourceUrl,
    },
  };
}

export function normalizeGoogleMapsPlaces(
  places: GoogleMapsPlace[],
  source = "google_maps",
): NormalizedBusinessResult[] {
  return places.map((place) => normalizeGoogleMapsPlace(place, source));
}
