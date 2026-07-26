/**
 * Pipeline runner — orchestrates parser → normalizer → validator →
 * deduplicator → AI placeholder. Soft-fails per result.
 */

import type { Connector } from "@/lib/scraping/connectors/connector";
import { ConnectorValidationError } from "@/lib/scraping/connectors/errors";
import type { ConnectorLogger } from "@/lib/scraping/connectors/logger";
import { enrichWithAiPlaceholder } from "@/lib/scraping/connectors/pipeline/ai-enrichment";
import { deduplicateBusinessResults } from "@/lib/scraping/connectors/pipeline/deduplicator";
import { normalizeBusinessResults } from "@/lib/scraping/connectors/pipeline/normalizer";
import { parseSearchResults } from "@/lib/scraping/connectors/pipeline/parser";
import { validateBusinessResults } from "@/lib/scraping/connectors/pipeline/validator";
import type {
  ConnectorSearchInput,
  MockPipelineRunSummary,
  NormalizedBusinessResult,
  ValidationIssue,
} from "@/lib/scraping/connectors/types";

export type PipelineRunnerDeps = {
  connector: Connector;
  logger: ConnectorLogger;
};

export type PipelineRunnerResult = {
  results: NormalizedBusinessResult[];
  fetchedCount: number;
  validCount: number;
  invalidCount: number;
  duplicatesRemoved: number;
  issues: ValidationIssue[];
};

/**
 * Runs the full processing pipeline for an already-connected connector search.
 */
export async function runProcessingPipeline(
  deps: PipelineRunnerDeps,
  input: ConnectorSearchInput,
): Promise<PipelineRunnerResult> {
  const { connector, logger } = deps;

  logger.info(connector.code, "Processing pipeline started");

  const validInput = await connector.validate(input);
  if (!validInput) {
    logger.error(connector.code, "Search input validation failed", { input });
    throw new ConnectorValidationError(
      "Invalid connector search input",
      connector.code,
    );
  }

  const searched = await connector.search(input);
  const fetchedCount = searched.results.length;
  logger.info(connector.code, "Search finished", { fetchedCount });

  const parsed = parseSearchResults(searched.results);
  logger.info(connector.code, "Parser finished", { count: parsed.length });

  const normalized = normalizeBusinessResults(parsed);
  logger.info(connector.code, "Normalizer finished", {
    count: normalized.length,
  });

  const validation = validateBusinessResults(normalized);
  logger.info(connector.code, "Validator finished", {
    valid: validation.valid.length,
    invalid: validation.invalid.length,
    issues: validation.issues.length,
  });

  for (const issue of validation.issues) {
    logger.warn(connector.code, `Validation: ${issue.message}`, {
      sourceId: issue.sourceId,
      field: issue.field,
    });
  }

  const deduped = deduplicateBusinessResults(validation.valid);
  logger.info(connector.code, "Deduplicator finished", {
    kept: deduped.results.length,
    duplicatesRemoved: deduped.duplicatesRemoved,
  });

  const enriched = enrichWithAiPlaceholder(deduped.results, {
    connectorCode: connector.code,
    logger,
  });

  logger.info(connector.code, "Processing pipeline finished", {
    results: enriched.length,
  });

  return {
    results: enriched,
    fetchedCount,
    validCount: validation.valid.length,
    invalidCount: validation.invalid.length,
    duplicatesRemoved: deduped.duplicatesRemoved,
    issues: validation.issues,
  };
}

/**
 * Full connect → pipeline → disconnect lifecycle.
 * Logs are captured after disconnect so the lifecycle is complete.
 */
export async function runPipelineWithLifecycle(
  deps: PipelineRunnerDeps,
  input: ConnectorSearchInput,
): Promise<MockPipelineRunSummary> {
  const { connector, logger } = deps;
  const started = Date.now();

  await connector.connect();
  logger.info(connector.code, "Connected");

  let outcome: PipelineRunnerResult | null = null;
  try {
    outcome = await runProcessingPipeline(deps, input);
  } finally {
    await connector.disconnect();
    logger.info(connector.code, "Disconnected");
  }

  if (!outcome) {
    throw new ConnectorValidationError(
      "Pipeline ended without a result",
      connector.code,
    );
  }

  return {
    connectorCode: connector.code,
    fetchedCount: outcome.fetchedCount,
    validCount: outcome.validCount,
    invalidCount: outcome.invalidCount,
    duplicatesRemoved: outcome.duplicatesRemoved,
    results: outcome.results,
    runtimeMs: Date.now() - started,
    logs: [...logger.entries()],
    issues: outcome.issues,
  };
}
