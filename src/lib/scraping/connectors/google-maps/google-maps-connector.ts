/**
 * GoogleMapsConnector — production-ready foundation with mock responses only.
 * No network, browser automation, Places API, or proxies in this phase.
 */

import type { Connector } from "@/lib/scraping/connectors/connector";
import {
  ConnectorNotConnectedError,
  ConnectorValidationError,
} from "@/lib/scraping/connectors/errors";
import {
  GOOGLE_MAPS_CAPABILITIES,
  GOOGLE_MAPS_CAPABILITY_PROFILE,
  type GoogleMapsCapabilityProfile,
} from "@/lib/scraping/connectors/google-maps/capabilities";
import {
  createGoogleMapsConfig,
  type GoogleMapsConnectorConfig,
} from "@/lib/scraping/connectors/google-maps/config";
import {
  getGoogleMapsMockPlaces,
  GOOGLE_MAPS_MOCK_PLACES,
} from "@/lib/scraping/connectors/google-maps/mock-data";
import {
  normalizeGoogleMapsPlace,
  normalizeGoogleMapsPlaces,
  placeToSearchHit,
} from "@/lib/scraping/connectors/google-maps/normalizer";
import type {
  GoogleMapsDetailsMockResponse,
  GoogleMapsPlace,
  GoogleMapsSearchMockResponse,
} from "@/lib/scraping/connectors/google-maps/types";
import type { ConnectorCapabilities } from "@/lib/scraping/connectors/capabilities";
import type {
  ConnectorCode,
  ConnectorSearchHit,
  ConnectorSearchInput,
  ConnectorSearchResponse,
  ConnectorSearchResult,
  ConnectorStatus,
  HealthStatus,
  NormalizedBusinessResult,
} from "@/lib/scraping/connectors/types";

export const GOOGLE_MAPS_CONNECTOR_CODE: ConnectorCode = "google_maps";

export type GoogleMapsConnectorOptions = {
  config?: Partial<GoogleMapsConnectorConfig>;
};

export class GoogleMapsConnector implements Connector {
  readonly code = GOOGLE_MAPS_CONNECTOR_CODE;
  readonly name = "Google Maps";
  readonly capabilities: ConnectorCapabilities = GOOGLE_MAPS_CAPABILITIES;
  readonly profile: GoogleMapsCapabilityProfile = GOOGLE_MAPS_CAPABILITY_PROFILE;

  private _status: ConnectorStatus = "idle";
  private _config: GoogleMapsConnectorConfig;
  private _shutdown = false;
  /** Pagination cursor state — reserved for multi-page fetches later. */
  private _currentPage = 1;
  private _nextPageToken: string | null = null;
  private _hasMore = false;

  constructor(options: GoogleMapsConnectorOptions = {}) {
    this._config = createGoogleMapsConfig(options.config);
  }

  get status(): ConnectorStatus {
    return this._status;
  }

  get config(): GoogleMapsConnectorConfig {
    return this._config;
  }

  get currentPage(): number {
    return this._currentPage;
  }

  get nextPageToken(): string | null {
    return this._nextPageToken;
  }

  get hasMore(): boolean {
    return this._hasMore;
  }

  updateConfig(overrides: Partial<GoogleMapsConnectorConfig>): void {
    this._config = createGoogleMapsConfig({
      ...this._config,
      ...overrides,
    });
  }

  async connect(): Promise<void> {
    if (this._shutdown) {
      throw new ConnectorValidationError(
        "Connector is shut down",
        this.code,
      );
    }
    // Future: initialize Places client / browser pool / proxy agent.
    this._status = "connected";
  }

  async disconnect(): Promise<void> {
    // Future: release browser contexts / HTTP clients.
    this._status = "disconnected";
  }

  async shutdown(): Promise<void> {
    await this.disconnect();
    this._shutdown = true;
    this._status = "disconnected";
  }

  async healthCheck(): Promise<HealthStatus> {
    if (this._shutdown) return "unhealthy";
    if (this._status === "error") return "unhealthy";
    if (this._status === "connected") return "healthy";
    return "degraded";
  }

  async validate(input: ConnectorSearchInput): Promise<boolean> {
    const query = input.query?.trim() ?? "";
    if (query.length < 2) return false;
    if (input.limit !== undefined && (input.limit < 1 || input.limit > 100)) {
      return false;
    }
    return true;
  }

  /**
   * Mock search — returns Places-shaped data normalized to CompanyResult.
   * MVP: single page only. Pagination fields are populated for future use.
   */
  async search(input: ConnectorSearchInput): Promise<ConnectorSearchResponse> {
    this.assertReady();

    const valid = await this.validate(input);
    if (!valid) {
      throw new ConnectorValidationError(
        "Search input failed validation",
        this.code,
      );
    }

    const mock = this.mockSearch(input, { page: 1, includeInvalidSamples: false });
    this._currentPage = mock.currentPage;
    this._nextPageToken = mock.nextPageToken;
    this._hasMore = mock.hasMore;

    const hits = mock.results.map(placeToSearchHit);
    return this.normalize(hits);
  }

  /**
   * Fetch a single place by id (mock). Ready for Places Details later.
   */
  async fetchDetails(placeId: string): Promise<NormalizedBusinessResult | null> {
    this.assertReady();

    const mock = this.mockDetails(placeId);
    if (!mock.result) return null;
    return normalizeGoogleMapsPlace(mock.result, this.code);
  }

  async normalize(hits: ConnectorSearchHit[]): Promise<ConnectorSearchResponse> {
    const results: ConnectorSearchResult[] = hits.map((hit) => {
      if (hit.raw && typeof hit.raw.placeId === "string") {
        const place = GOOGLE_MAPS_MOCK_PLACES.find(
          (item) => item.placeId === hit.raw?.placeId,
        );
        if (place) {
          return normalizeGoogleMapsPlace(place, this.code);
        }
      }

      return {
        source: this.code,
        sourceId: hit.sourceId?.trim() || hit.sourceUrl,
        name: hit.name.trim(),
        website: hit.website?.trim() || null,
        emails: hit.emails ?? (hit.email ? [hit.email] : []),
        phones: hit.phones ?? (hit.phone ? [hit.phone] : []),
        street: hit.street?.trim() || null,
        postalCode: hit.postalCode?.trim() || null,
        city: hit.city?.trim() || null,
        region: hit.region?.trim() || null,
        countryCode:
          hit.countryCode?.trim().toUpperCase() ||
          hit.country?.trim().toUpperCase() ||
          null,
        industry: hit.industry?.trim() || null,
        categories: hit.categories ? [...hit.categories] : [],
        description: hit.description?.trim() || null,
        latitude: hit.latitude ?? null,
        longitude: hit.longitude ?? null,
        confidence:
          typeof hit.confidence === "number" && Number.isFinite(hit.confidence)
            ? hit.confidence
            : 0.5,
        rawData: {
          ...(hit.raw ?? {}),
          sourceUrl: hit.sourceUrl,
          provider: "google_maps",
          currentPage: this._currentPage,
          nextPageToken: this._nextPageToken,
          hasMore: this._hasMore,
        },
      };
    });

    return {
      connectorCode: this.code,
      results,
      total: results.length,
    };
  }

  /**
   * Expose raw mock search for tests / future adapter comparison.
   * Always returns one page in MVP (`hasMore` may still be true).
   */
  mockSearch(
    input: ConnectorSearchInput,
    options?: { page?: number; includeInvalidSamples?: boolean },
  ): GoogleMapsSearchMockResponse {
    const page = options?.page ?? 1;
    const pageSize = this._config.pageSize;
    const limit =
      input.limit ?? Math.min(pageSize, this._config.pageSize * this._config.maxPages);

    const all = getGoogleMapsMockPlaces({
      countries: input.countries?.length
        ? input.countries
        : this._config.countries,
      cities: input.cities?.length ? input.cities : this._config.cities,
      categories: this._config.categories,
      query: input.query,
      limit: pageSize * Math.max(page, this._config.maxPages),
      includeInvalidSamples: options?.includeInvalidSamples ?? false,
    });

    // MVP: only serve page 1. Tokens/hasMore prepare multi-page later.
    const start = 0;
    const results = all.slice(start, start + limit);
    const hasMore = all.length > results.length;
    const nextPageToken = hasMore ? `mock-page-${page + 1}` : null;

    return {
      status: results.length > 0 ? "MOCK" : "ZERO_RESULTS",
      query: input.query,
      results,
      currentPage: page,
      nextPageToken,
      hasMore,
    };
  }

  mockDetails(placeId: string): GoogleMapsDetailsMockResponse {
    const result =
      GOOGLE_MAPS_MOCK_PLACES.find((place) => place.placeId === placeId) ??
      null;
    return {
      status: result ? "MOCK" : "NOT_FOUND",
      result,
    };
  }

  /** Helper for test services that want normalized catalog rows. */
  listNormalizedMockResults(limit = 50): NormalizedBusinessResult[] {
    return normalizeGoogleMapsPlaces(
      getGoogleMapsMockPlaces({ limit, includeInvalidSamples: true }),
      this.code,
    );
  }

  private assertReady(): void {
    if (this._shutdown) {
      throw new ConnectorValidationError(
        "Connector is shut down",
        this.code,
      );
    }
    if (this._status !== "connected") {
      throw new ConnectorNotConnectedError(this.code);
    }
  }
}

export function createGoogleMapsConnector(
  options?: GoogleMapsConnectorOptions,
): GoogleMapsConnector {
  return new GoogleMapsConnector(options);
}

/** Re-export place type for adapters. */
export type { GoogleMapsPlace };
