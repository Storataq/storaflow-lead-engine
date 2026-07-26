/**
 * Google Maps mock test service — local only, no network.
 */

import { ConnectorError } from "@/lib/scraping/connectors/errors";
import {
  ConnectorFactory,
  defaultConnectorFactory,
} from "@/lib/scraping/connectors/factory";
import {
  GoogleMapsConnector,
  GOOGLE_MAPS_CONNECTOR_CODE,
} from "@/lib/scraping/connectors/google-maps/google-maps-connector";
import { validateGoogleMapsResults } from "@/lib/scraping/connectors/google-maps/validator";
import {
  InMemoryConnectorLogger,
  type ConnectorLogEntry,
  type ConnectorLogger,
} from "@/lib/scraping/connectors/logger";
import type {
  ConnectorSearchInput,
  NormalizedBusinessResult,
  ValidationIssue,
} from "@/lib/scraping/connectors/types";

export type GoogleMapsMockTestResult = {
  success: boolean;
  message: string;
  connectorCode: string;
  runtimeMs: number;
  fetchedCount: number;
  validCount: number;
  invalidCount: number;
  results: NormalizedBusinessResult[];
  issues: ValidationIssue[];
  logs: ConnectorLogEntry[];
};

export type GoogleMapsMockTestServiceOptions = {
  factory?: ConnectorFactory;
  logger?: ConnectorLogger;
};

const DEFAULT_INPUT: ConnectorSearchInput = {
  query: "local businesses",
  countries: ["NL", "DE", "BE", "FR", "GB", "US", "ES", "IT"],
  limit: 55,
};

export class GoogleMapsMockTestService {
  private readonly factory: ConnectorFactory;

  constructor(options: GoogleMapsMockTestServiceOptions = {}) {
    this.factory = options.factory ?? defaultConnectorFactory;
  }

  async run(
    input: ConnectorSearchInput = DEFAULT_INPUT,
  ): Promise<GoogleMapsMockTestResult> {
    const started = Date.now();
    const logger = new InMemoryConnectorLogger();
    const code = GOOGLE_MAPS_CONNECTOR_CODE;

    try {
      const connector = this.factory.create(code);
      if (!(connector instanceof GoogleMapsConnector)) {
        throw new ConnectorError(
          "Resolved connector is not GoogleMapsConnector",
          { code: "CONNECTOR_TYPE_MISMATCH", connectorCode: code },
        );
      }

      logger.info(code, "Connector loaded", {
        name: connector.name,
        provider: connector.profile.provider,
      });

      await connector.connect();
      const health = await connector.healthCheck();
      logger.info(code, "Mock request", {
        query: input.query,
        limit: input.limit ?? 55,
        health,
      });

      const mockResponse = connector.mockSearch(input);
      logger.info(code, "Parsing", {
        status: mockResponse.status,
        count: mockResponse.results.length,
      });

      const searched = await connector.search(input);
      logger.info(code, "Normalization", {
        count: searched.results.length,
      });

      const validation = validateGoogleMapsResults(searched.results);
      logger.info(code, "Validation", {
        valid: validation.valid.length,
        invalid: validation.invalid.length,
        issues: validation.issues.length,
      });

      for (const issue of validation.issues) {
        logger.warn(code, `Validation: ${issue.message}`, {
          sourceId: issue.sourceId,
          field: issue.field,
        });
      }

      await connector.disconnect();

      logger.info(code, "Completed", {
        fetched: searched.total,
        valid: validation.valid.length,
        invalid: validation.invalid.length,
      });

      return {
        success: true,
        message: `Google Maps: ${validation.valid.length} geldige mock plaatsen (${validation.invalid.length} ongeldig)`,
        connectorCode: code,
        runtimeMs: Date.now() - started,
        fetchedCount: searched.total,
        validCount: validation.valid.length,
        invalidCount: validation.invalid.length,
        results: validation.valid,
        issues: validation.issues,
        logs: [...logger.entries()],
      };
    } catch (error) {
      const message =
        error instanceof ConnectorError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Google Maps mock test failed";

      logger.error(code, message);

      return {
        success: false,
        message,
        connectorCode: code,
        runtimeMs: Date.now() - started,
        fetchedCount: 0,
        validCount: 0,
        invalidCount: 0,
        results: [],
        issues: [],
        logs: [...logger.entries()],
      };
    }
  }
}

export const defaultGoogleMapsMockTestService = new GoogleMapsMockTestService();

export async function runGoogleMapsMockTest(
  input?: ConnectorSearchInput,
): Promise<GoogleMapsMockTestResult> {
  return defaultGoogleMapsMockTestService.run(input);
}
