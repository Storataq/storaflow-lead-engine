/**
 * MockConnector — dummy data only. No network, no APIs, no browser.
 */

import type { ConnectorCapabilities } from "@/lib/scraping/connectors/capabilities";
import { MOCK_CAPABILITIES } from "@/lib/scraping/connectors/capabilities";
import type { Connector } from "@/lib/scraping/connectors/connector";
import {
  ConnectorNotConnectedError,
  ConnectorValidationError,
} from "@/lib/scraping/connectors/errors";
import type {
  ConnectorCode,
  ConnectorSearchHit,
  ConnectorSearchInput,
  ConnectorSearchResponse,
  ConnectorSearchResult,
  ConnectorStatus,
  HealthStatus,
} from "@/lib/scraping/connectors/types";

const MOCK_CODE: ConnectorCode = "mock";

export class MockConnector implements Connector {
  readonly code = MOCK_CODE;
  readonly name = "Mock Connector";
  readonly capabilities: ConnectorCapabilities = MOCK_CAPABILITIES;

  private _status: ConnectorStatus = "idle";

  get status(): ConnectorStatus {
    return this._status;
  }

  async connect(): Promise<void> {
    this._status = "connected";
  }

  async disconnect(): Promise<void> {
    this._status = "disconnected";
  }

  async validate(input: ConnectorSearchInput): Promise<boolean> {
    const query = input.query?.trim() ?? "";
    if (query.length < 2) {
      return false;
    }
    if (input.limit !== undefined && (input.limit < 1 || input.limit > 100)) {
      return false;
    }
    return true;
  }

  async search(input: ConnectorSearchInput): Promise<ConnectorSearchResponse> {
    if (this._status !== "connected") {
      throw new ConnectorNotConnectedError(this.code);
    }

    const valid = await this.validate(input);
    if (!valid) {
      throw new ConnectorValidationError(
        "Search input failed validation",
        this.code,
      );
    }

    const limit = input.limit ?? 5;
    const country = input.countries?.[0] ?? "NL";
    const city = input.cities?.[0] ?? "Amsterdam";
    const keyword = input.query.trim();

    const hits: ConnectorSearchHit[] = Array.from({ length: limit }, (_, index) => {
      const n = index + 1;
      const slug = keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "company";
      const domain = `${slug}-${n}.example`;
      return {
        name: `${keyword} Mock Co ${n}`,
        website: `https://${domain}`,
        city,
        region: input.regions?.[0] ?? null,
        country,
        phone: `+31 20 0000 ${String(100 + n).slice(-3)}`,
        email: `info@${domain}`,
        sourceUrl: `https://mock.lead-engine.local/foundation/${this.code}/${n}`,
        raw: { mock: true, index: n },
      };
    });

    return this.normalize(hits);
  }

  async normalize(hits: ConnectorSearchHit[]): Promise<ConnectorSearchResponse> {
    const results: ConnectorSearchResult[] = hits.map((hit) => ({
      companyName: hit.name.trim(),
      website: hit.website?.trim() || null,
      city: hit.city?.trim() || null,
      region: hit.region?.trim() || null,
      country: hit.country?.trim().toUpperCase() || null,
      phone: hit.phone?.trim() || null,
      email: hit.email?.trim().toLowerCase() || null,
      sourceUrl: hit.sourceUrl,
      sourceCode: this.code,
    }));

    return {
      connectorCode: this.code,
      results,
      total: results.length,
    };
  }

  async healthCheck(): Promise<HealthStatus> {
    return this._status === "error" ? "unhealthy" : "healthy";
  }
}

export function createMockConnector(): MockConnector {
  return new MockConnector();
}
