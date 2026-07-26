/**
 * Mock test service — runs one full foundation pipeline end-to-end.
 * Search Query → ConnectorFactory → MockConnector → pipeline → summary.
 */

import { ConnectorError } from "@/lib/scraping/connectors/errors";
import {
  ConnectorFactory,
  defaultConnectorFactory,
} from "@/lib/scraping/connectors/factory";
import {
  InMemoryConnectorLogger,
  type ConnectorLogger,
} from "@/lib/scraping/connectors/logger";
import { runPipelineWithLifecycle } from "@/lib/scraping/connectors/pipeline/runner";
import type {
  ConnectorCode,
  ConnectorSearchInput,
  MockPipelineRunSummary,
} from "@/lib/scraping/connectors/types";

export type MockTestServiceOptions = {
  factory?: ConnectorFactory;
  logger?: ConnectorLogger;
};

export type MockTestServiceResult = {
  success: boolean;
  message: string;
  summary?: MockPipelineRunSummary;
};

const DEFAULT_INPUT: ConnectorSearchInput = {
  query: "mock businesses",
  countries: ["NL", "DE", "BE", "FR", "GB"],
  cities: ["Amsterdam", "Berlin", "Antwerp"],
  limit: 25,
};

export class MockTestService {
  private readonly factory: ConnectorFactory;

  constructor(options: MockTestServiceOptions = {}) {
    this.factory = options.factory ?? defaultConnectorFactory;
  }

  async run(
    connectorCode: ConnectorCode = "mock",
    input: ConnectorSearchInput = DEFAULT_INPUT,
  ): Promise<MockTestServiceResult> {
    const logger = new InMemoryConnectorLogger();

    try {
      const connector = this.factory.create(connectorCode);
      logger.info(connectorCode, "Resolved connector via ConnectorFactory", {
        name: connector.name,
      });

      const summary = await runPipelineWithLifecycle(
        { connector, logger },
        {
          ...DEFAULT_INPUT,
          ...input,
          query: input.query?.trim() || DEFAULT_INPUT.query,
          limit: input.limit ?? DEFAULT_INPUT.limit,
        },
      );

      // Ensure disconnect log is included after lifecycle finally.
      const logs = [...logger.entries()];

      return {
        success: true,
        message: `${connector.name}: ${summary.results.length} resultaten (${summary.fetchedCount} opgehaald, ${summary.invalidCount} ongeldig, ${summary.duplicatesRemoved} duplicaten)`,
        summary: {
          ...summary,
          logs,
        },
      };
    } catch (error) {
      const message =
        error instanceof ConnectorError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Mock pipeline failed";

      logger.error(connectorCode, message);

      return {
        success: false,
        message,
        summary: {
          connectorCode,
          fetchedCount: 0,
          validCount: 0,
          invalidCount: 0,
          duplicatesRemoved: 0,
          results: [],
          runtimeMs: 0,
          logs: [...logger.entries()],
          issues: [],
        },
      };
    }
  }
}

export const defaultMockTestService = new MockTestService();

export async function runMockPipelineTest(
  connectorCode: ConnectorCode = "mock",
  input?: ConnectorSearchInput,
): Promise<MockTestServiceResult> {
  return defaultMockTestService.run(connectorCode, input);
}
