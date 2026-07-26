/**
 * Maps Nominatim places → ConnectorSearchHit for the shared pipeline.
 */

import type { NominatimPlace } from "@/lib/scraping/connectors/openstreetmap/nominatim-client";
import type { ConnectorSearchHit } from "@/lib/scraping/connectors/types";

function companyNameFromDisplay(displayName: string): string {
  const first = displayName.split(",")[0]?.trim();
  return first && first.length > 0 ? first : displayName.trim();
}

function streetFromAddress(
  address: NominatimPlace["address"],
): string | null {
  if (!address) return null;
  const road = address.road ?? address.pedestrian ?? null;
  if (!road) return null;
  return address.house_number ? `${road} ${address.house_number}` : road;
}

function cityFromAddress(address: NominatimPlace["address"]): string | null {
  if (!address) return null;
  return (
    address.city ??
    address.town ??
    address.village ??
    address.municipality ??
    null
  );
}

export function mapNominatimPlaceToHit(
  place: NominatimPlace,
): ConnectorSearchHit {
  const address = place.address;
  const lat = Number(place.lat);
  const lon = Number(place.lon);
  const category =
    [place.class, place.type].filter(Boolean).join(" / ") || null;

  return {
    sourceId: String(place.place_id),
    name: companyNameFromDisplay(place.display_name),
    website: null,
    emails: [],
    phones: [],
    street: streetFromAddress(address),
    postalCode: address?.postcode ?? null,
    city: cityFromAddress(address),
    region: address?.state ?? address?.county ?? null,
    country: address?.country ?? null,
    countryCode: address?.country_code?.toUpperCase() ?? null,
    industry: category,
    categories: [place.class, place.type].filter(
      (value): value is string => Boolean(value),
    ),
    description: place.display_name,
    latitude: Number.isFinite(lat) ? lat : null,
    longitude: Number.isFinite(lon) ? lon : null,
    confidence: Math.min(
      0.95,
      Math.max(0.35, typeof place.importance === "number" ? place.importance : 0.5),
    ),
    sourceUrl: `https://www.openstreetmap.org/${place.osm_type ?? "node"}/${place.osm_id ?? place.place_id}`,
    raw: {
      place_id: place.place_id,
      osm_type: place.osm_type,
      osm_id: place.osm_id,
      display_name: place.display_name,
      class: place.class,
      type: place.type,
    },
  };
}
