/**
 * OpenStreetMap Nominatim — first live connector (HTTP only, no API key).
 * Respects Nominatim usage policy: identifying User-Agent + ≤1 request/second.
 */

import { DEFAULT_USER_AGENT } from "@/lib/constants";

export type NominatimSearchParams = {
  query: string;
  countryCodes?: string[];
  limit?: number;
  signal?: AbortSignal;
};

export type NominatimPlace = {
  place_id: number;
  osm_type?: string;
  osm_id?: number;
  display_name: string;
  lat: string;
  lon: string;
  importance?: number;
  type?: string;
  class?: string;
  address?: {
    house_number?: string;
    road?: string;
    pedestrian?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
};

let lastRequestAt = 0;
const MIN_INTERVAL_MS = 1100;

async function respectRateLimit(): Promise<void> {
  const now = Date.now();
  const wait = MIN_INTERVAL_MS - (now - lastRequestAt);
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  lastRequestAt = Date.now();
}

export async function nominatimSearch(
  params: NominatimSearchParams,
): Promise<NominatimPlace[]> {
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 40);
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", params.query);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", String(limit));
  if (params.countryCodes?.length) {
    url.searchParams.set(
      "countrycodes",
      params.countryCodes.map((code) => code.toLowerCase()).join(","),
    );
  }

  await respectRateLimit();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  const signal = params.signal ?? controller.signal;

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": DEFAULT_USER_AGENT,
      },
      signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Nominatim HTTP ${response.status}: ${response.statusText || "request failed"}`,
      );
    }

    const data = (await response.json()) as unknown;
    if (!Array.isArray(data)) {
      return [];
    }
    return data as NominatimPlace[];
  } finally {
    clearTimeout(timeout);
  }
}
