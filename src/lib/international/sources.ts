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
  { code: "mock", labelEn: "Mock Connector" },
  { code: "google_maps", labelEn: "Google Maps" },
  { code: "google_search", labelEn: "Google Search" },
  { code: "google_business_profile", labelEn: "Google Business Profile" },
  { code: "openstreetmap", labelEn: "OpenStreetMap (Live)" },
  { code: "bing", labelEn: "Bing" },
  { code: "bing_places", labelEn: "Bing Places" },
  { code: "linkedin", labelEn: "LinkedIn" },
  { code: "facebook", labelEn: "Facebook" },
  { code: "instagram", labelEn: "Instagram" },
  { code: "tiktok", labelEn: "TikTok" },
  { code: "yelp", labelEn: "Yelp" },
  { code: "yellow_pages", labelEn: "Yellow Pages" },
  { code: "gouden_gids", labelEn: "Gouden Gids" },
  { code: "trustpilot", labelEn: "Trustpilot" },
  { code: "opencorporates", labelEn: "OpenCorporates" },
  { code: "company_website", labelEn: "Company Websites" },
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
