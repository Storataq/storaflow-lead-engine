/**
 * Google Maps connector — configuration only (no live I/O yet).
 * Future adapters (Places API / Playwright / Puppeteer / proxy) plug in here
 * without changing call sites.
 */

export type GoogleMapsConnectorConfig = {
  /** ISO 3166-1 alpha-2 */
  countries: string[];
  regions: string[];
  cities: string[];
  /** Search radius in meters (Places-style). */
  searchRadiusMeters: number;
  categories: string[];
  keywords: string[];
  /** BCP 47 / ISO language codes */
  languages: string[];
  /** Pagination */
  pageSize: number;
  maxPages: number;
  /** Rate limiting */
  rateLimitPerMinute: number;
  /** Retries */
  maxRetries: number;
  retryBackoffMs: number;
  /** Timeout per request (ms) */
  timeoutMs: number;
  /**
   * Future execution modes — config flags only in this foundation phase.
   * Do not enable live behaviour yet.
   */
  enablePlacesApi: boolean;
  enablePlaywright: boolean;
  enablePuppeteer: boolean;
  proxyEnabled: boolean;
  captchaHandlingEnabled: boolean;
  monitoringEnabled: boolean;
};

export const DEFAULT_GOOGLE_MAPS_CONFIG: GoogleMapsConnectorConfig = {
  countries: ["NL", "DE", "BE", "FR", "GB", "US", "ES", "IT"],
  regions: [],
  cities: [],
  searchRadiusMeters: 5_000,
  categories: [
    "restaurant",
    "cafe",
    "store",
    "gym",
    "dentist",
    "hotel",
    "florist",
    "plumber",
  ],
  keywords: [],
  languages: ["en", "nl", "de", "fr"],
  pageSize: 20,
  maxPages: 3,
  rateLimitPerMinute: 20,
  maxRetries: 3,
  retryBackoffMs: 500,
  timeoutMs: 30_000,
  enablePlacesApi: false,
  enablePlaywright: false,
  enablePuppeteer: false,
  proxyEnabled: false,
  captchaHandlingEnabled: false,
  monitoringEnabled: false,
};

export function createGoogleMapsConfig(
  overrides: Partial<GoogleMapsConnectorConfig> = {},
): GoogleMapsConnectorConfig {
  return {
    ...DEFAULT_GOOGLE_MAPS_CONFIG,
    ...overrides,
    countries: overrides.countries ?? [...DEFAULT_GOOGLE_MAPS_CONFIG.countries],
    regions: overrides.regions ?? [...DEFAULT_GOOGLE_MAPS_CONFIG.regions],
    cities: overrides.cities ?? [...DEFAULT_GOOGLE_MAPS_CONFIG.cities],
    categories: overrides.categories ?? [
      ...DEFAULT_GOOGLE_MAPS_CONFIG.categories,
    ],
    keywords: overrides.keywords ?? [...DEFAULT_GOOGLE_MAPS_CONFIG.keywords],
    languages: overrides.languages ?? [...DEFAULT_GOOGLE_MAPS_CONFIG.languages],
  };
}
