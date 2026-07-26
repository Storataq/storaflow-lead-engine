/**
 * Live OpenStreetMap connector — Nominatim search (no API key, no Puppeteer).
 */

import type { ConnectorCapabilities } from "@/lib/scraping/connectors/capabilities";
import type { Connector } from "@/lib/scraping/connectors/connector";
import {
  ConnectorNotConnectedError,
  ConnectorValidationError,
} from "@/lib/scraping/connectors/errors";
import { mapNominatimPlaceToHit } from "@/lib/scraping/connectors/openstreetmap/mapper";
import { nominatimSearch } from "@/lib/scraping/connectors/openstreetmap/nominatim-client";
import { normalizeBusinessResults } from "@/lib/scraping/connectors/pipeline/normalizer";
import { parseSearchHits } from "@/lib/scraping/connectors/pipeline/parser";
import type {
  ConnectorCode,
  ConnectorSearchHit,
  ConnectorSearchInput,
  ConnectorSearchResponse,
  ConnectorStatus,
  HealthStatus,
} from "@/lib/scraping/connectors/types";

export const OPENSTREETMAP_CONNECTOR_CODE: ConnectorCode = "openstreetmap";

export const OPENSTREETMAP_CAPABILITIES: ConnectorCapabilities = {
  supportsSearch: true,
  supportsCompanies: true,
  supportsContacts: false,
  supportsWebsites: false,
  supportsPhoneNumbers: false,
  supportsEmail: false,
  supportedCountries: [],
  requiresApiKey: false,
  requiresProxy: false,
  requiresLogin: false,
};

export type OpenStreetMapConnectorOptions = {
  /** Injected for tests — defaults to live nominatimSearch. */
  searchFn?: typeof nominatimSearch;
};

export class OpenStreetMapConnector implements Connector {
  readonly code = OPENSTREETMAP_CONNECTOR_CODE;
  readonly name = "OpenStreetMap (Nominatim)";
  readonly capabilities = OPENSTREETMAP_CAPABILITIES;
  status: ConnectorStatus = "idle";

  private readonly searchFn: typeof nominatimSearch;

  constructor(options: OpenStreetMapConnectorOptions = {}) {
    this.searchFn = options.searchFn ?? nominatimSearch;
  }

  async connect(): Promise<void> {
    this.status = "connected";
  }

  async disconnect(): Promise<void> {
    this.status = "disconnected";
  }

  async validate(input: ConnectorSearchInput): Promise<boolean> {
    return Boolean(input.query?.trim());
  }

  async healthCheck(): Promise<HealthStatus> {
    return this.status === "connected" ? "healthy" : "degraded";
  }

  async search(input: ConnectorSearchInput): Promise<ConnectorSearchResponse> {
    if (this.status !== "connected") {
      throw new ConnectorNotConnectedError(this.code);
    }
    if (!(await this.validate(input))) {
      throw new ConnectorValidationError("query is required", this.code);
    }

    const parts = [input.query.trim()];
    if (input.cities?.[0]) parts.push(input.cities[0]);
    if (input.regions?.[0]) parts.push(input.regions[0]);

    const places = await this.searchFn({
      query: parts.join(", "),
      countryCodes: input.countries,
      limit: input.limit ?? 20,
    });

    const hits: ConnectorSearchHit[] = places.map(mapNominatimPlaceToHit);
    return this.normalize(hits);
  }

  async normalize(hits: ConnectorSearchHit[]): Promise<ConnectorSearchResponse> {
    const parsed = parseSearchHits(this.code, hits);
    const results = normalizeBusinessResults(parsed);
    return {
      connectorCode: this.code,
      results,
      total: results.length,
    };
  }
}

export function createOpenStreetMapConnector(
  options?: OpenStreetMapConnectorOptions,
): OpenStreetMapConnector {
  return new OpenStreetMapConnector(options);
}
