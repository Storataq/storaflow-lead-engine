export type SourceRecord = {
  /** Stable machine key for future connectors */
  code: string;
  /** English label */
  labelEn: string;
};

/**
 * Extensible lead-source catalog.
 * Stored as codes in search_queries.sources.
 */
export const SOURCES: SourceRecord[] = [
  { code: "google_search", labelEn: "Google" },
  { code: "google_maps", labelEn: "Google Maps" },
  { code: "google_business_profile", labelEn: "Google Business Profile" },
  { code: "company_website", labelEn: "Company Websites" },
  { code: "linkedin", labelEn: "LinkedIn" },
  { code: "facebook", labelEn: "Facebook" },
  { code: "instagram", labelEn: "Instagram" },
  { code: "yelp", labelEn: "Yelp" },
  { code: "gouden_gids", labelEn: "Gouden Gids" },
  { code: "yellow_pages", labelEn: "Yellow Pages" },
  { code: "bing_places", labelEn: "Bing Places" },
  { code: "openstreetmap", labelEn: "OpenStreetMap" },
  { code: "tiktok", labelEn: "TikTok" },
  { code: "directories", labelEn: "Business directories" },
  { code: "other", labelEn: "Other / future connectors" },
];

export const SOURCE_BY_CODE: Record<string, SourceRecord> = Object.fromEntries(
  SOURCES.map((source) => [source.code, source]),
);

export function isSourceCode(value: string): boolean {
  return Object.prototype.hasOwnProperty.call(SOURCE_BY_CODE, value);
}

export function formatSourceLabel(code: string): string {
  return SOURCE_BY_CODE[code]?.labelEn ?? code;
}

export function formatSourceList(codes: string[]): string {
  if (!codes.length) return "—";
  return codes.map((code) => formatSourceLabel(code)).join(", ");
}
