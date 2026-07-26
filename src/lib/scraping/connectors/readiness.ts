/**
 * Phase 20B readiness — additive types for live scraper execution.
 * Does NOT implement network I/O. Existing Connector interface remains the runtime contract.
 */

/** Pagination cursor for connector search pages (future live providers). */
export type ConnectorPagination = {
  page?: number;
  pageSize?: number;
  cursor?: string | null;
  hasMore?: boolean;
  nextCursor?: string | null;
};

/** Soft cancellation signal — workers will check between pages. */
export type ConnectorCancellation = {
  /** When true, connector should stop fetching new pages. */
  isCancelled: () => boolean;
  reason?: string;
};

/** Rate-limit metadata reported by a connector run. */
export type ConnectorRateLimitInfo = {
  limitPerMinute: number;
  remaining?: number;
  resetAt?: string | null;
};

/** Retry policy hints (executor applies these; connectors stay side-effect free). */
export type ConnectorRetryPolicy = {
  maxAttempts: number;
  backoffMs: number;
  retryableErrorCodes?: readonly string[];
};

/** Aggregate stats for a connector run / job step. */
export type ConnectorRunStatistics = {
  requested: number;
  fetched: number;
  normalized: number;
  duplicatesRemoved: number;
  rejected: number;
  persisted: number;
  errorCount: number;
  runtimeMs: number;
};

/**
 * Optional live-execution context passed into future connector adapters.
 * Mock connectors ignore this object today.
 */
export type ConnectorExecutionContext = {
  organizationId: string;
  jobId?: string;
  mode: "mock" | "live";
  pagination?: ConnectorPagination;
  cancellation?: ConnectorCancellation;
  rateLimit?: ConnectorRateLimitInfo;
  retry?: ConnectorRetryPolicy;
};

/** Documented pipeline for Phase 20B (search → CRM). */
export const LIVE_SCRAPER_PIPELINE_STEPS = [
  "search_request",
  "search_job",
  "queue",
  "worker",
  "connector",
  "normalized_results",
  "duplicate_detection",
  "companies_and_contacts",
  "crm",
] as const;

export type LiveScraperPipelineStep =
  (typeof LIVE_SCRAPER_PIPELINE_STEPS)[number];
