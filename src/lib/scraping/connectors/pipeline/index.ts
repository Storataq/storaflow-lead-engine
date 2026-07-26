/**
 * Pipeline public barrel.
 */

export { enrichWithAiPlaceholder } from "@/lib/scraping/connectors/pipeline/ai-enrichment";
export { deduplicateBusinessResults } from "@/lib/scraping/connectors/pipeline/deduplicator";
export {
  normalizeBusinessResult,
  normalizeBusinessResults,
  normalizeCompanyName,
  normalizeDomain,
} from "@/lib/scraping/connectors/pipeline/normalizer";
export {
  parseSearchHits,
  parseSearchResults,
} from "@/lib/scraping/connectors/pipeline/parser";
export {
  runPipelineWithLifecycle,
  runProcessingPipeline,
  type PipelineRunnerDeps,
  type PipelineRunnerResult,
} from "@/lib/scraping/connectors/pipeline/runner";
export {
  validateBusinessResult,
  validateBusinessResults,
} from "@/lib/scraping/connectors/pipeline/validator";
