/**
 * Compatibility entry for the connector pipeline.
 * Prefer imports from `@/lib/scraping/connectors/pipeline`.
 */

import type { Connector } from "@/lib/scraping/connectors/connector";
import type { ConnectorLogger } from "@/lib/scraping/connectors/logger";
import { runPipelineWithLifecycle } from "@/lib/scraping/connectors/pipeline/runner";
import type {
  ConnectorSearchInput,
  ConnectorSearchResponse,
  MockPipelineRunSummary,
} from "@/lib/scraping/connectors/types";

export type ConnectorPipelineDeps = {
  connector: Connector;
  logger: ConnectorLogger;
};

/**
 * Runs the full mock processing pipeline and maps to ConnectorSearchResponse.
 */
export async function runConnectorPipeline(
  deps: ConnectorPipelineDeps,
  input: ConnectorSearchInput,
): Promise<ConnectorSearchResponse> {
  const summary = await runPipelineWithLifecycle(deps, input);
  return {
    connectorCode: summary.connectorCode,
    results: summary.results,
    total: summary.results.length,
  };
}

export async function runConnectorPipelineDetailed(
  deps: ConnectorPipelineDeps,
  input: ConnectorSearchInput,
): Promise<MockPipelineRunSummary> {
  return runPipelineWithLifecycle(deps, input);
}

export {
  enrichWithAiPlaceholder,
  deduplicateBusinessResults,
  normalizeBusinessResults,
  parseSearchHits,
  parseSearchResults,
  runProcessingPipeline,
  validateBusinessResults,
} from "@/lib/scraping/connectors/pipeline/index";
