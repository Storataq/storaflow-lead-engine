/**
 * Production-facing connector architecture surface for Phase 20B.
 * Provider-specific logic stays inside connector packages — not here.
 */

export type {
  Connector,
} from "@/lib/scraping/connectors/connector";
export type {
  ConnectorCapabilities,
} from "@/lib/scraping/connectors/capabilities";
export type {
  ConnectorCode,
  ConnectorSearchResult as ConnectorResult,
  ConnectorStatus,
  HealthStatus as ConnectorHealth,
  ConnectorSearchResponse,
} from "@/lib/scraping/connectors/types";
export type {
  ConnectorExecutionContext as ConnectorRuntime,
  ConnectorRunStatistics as ConnectorStatistics,
  ConnectorRetryPolicy,
  ConnectorRateLimitInfo,
  ConnectorPagination,
  ConnectorCancellation,
} from "@/lib/scraping/connectors/readiness";
export {
  ConnectorError,
  ConnectorNotConnectedError,
  ConnectorNotFoundError,
  ConnectorValidationError,
} from "@/lib/scraping/connectors/errors";

/** Runtime configuration passed to future live adapters. */
export type ConnectorConfiguration = {
  enabled: boolean;
  mode: "mock" | "live";
  timeoutMs: number;
  maxResults: number;
  rateLimitPerMinute: number;
  retryCount: number;
};
