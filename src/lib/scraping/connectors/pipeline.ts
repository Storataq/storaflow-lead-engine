/**
 * Foundation pipeline stubs:
 * search → validate → normalize
 * (Parser / AI / persist hooks arrive in later steps.)
 */

import type { Connector } from "@/lib/scraping/connectors/connector";
import { ConnectorValidationError } from "@/lib/scraping/connectors/errors";
import type { ConnectorLogger } from "@/lib/scraping/connectors/logger";
import type {
  ConnectorSearchInput,
  ConnectorSearchResponse,
} from "@/lib/scraping/connectors/types";

export type ConnectorPipelineDeps = {
  connector: Connector;
  logger: ConnectorLogger;
};

/**
 * Runs validate → search → normalize using the injected connector.
 */
export async function runConnectorPipeline(
  deps: ConnectorPipelineDeps,
  input: ConnectorSearchInput,
): Promise<ConnectorSearchResponse> {
  const { connector, logger } = deps;

  logger.info(connector.code, "Pipeline started");

  const valid = await connector.validate(input);
  if (!valid) {
    logger.error(connector.code, "Validation failed", { input });
    throw new ConnectorValidationError(
      "Invalid connector search input",
      connector.code,
    );
  }

  await connector.connect();
  logger.info(connector.code, "Connected");

  try {
    const searched = await connector.search(input);
    logger.info(connector.code, "Search finished", {
      total: searched.total,
    });

    // search() already returns normalized results for MockConnector;
    // re-normalize via public API for a consistent pipeline contract.
    const normalized = await connector.normalize(
      searched.results.map((result) => ({
        name: result.companyName,
        website: result.website,
        city: result.city,
        region: result.region,
        country: result.country,
        phone: result.phone,
        email: result.email,
        sourceUrl: result.sourceUrl,
      })),
    );

    logger.info(connector.code, "Pipeline finished", {
      total: normalized.total,
    });
    return normalized;
  } finally {
    await connector.disconnect();
    logger.info(connector.code, "Disconnected");
  }
}
