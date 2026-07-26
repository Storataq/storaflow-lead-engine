/**
 * Company Intelligence — connector contracts (Phase 16).
 *
 * Production-ready interfaces for future live connectors.
 * No implementations, no network calls, no scraping.
 *
 * Separate from `src/lib/scraping/connectors` to avoid touching
 * the existing connector framework.
 */

/** Lifecycle / availability status for a intelligence source card. */
export type IntelligenceSourceBadge =
  | "ready"
  | "coming_soon"
  | "disabled"
  | "mock_source"
  | "inactive"
  | "healthy"
  | "warning"
  | "offline";

export type ConnectorQueueStatus =
  | "idle"
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "retrying";

export type ConnectorStatus =
  | "ready"
  | "coming_soon"
  | "disabled"
  | "inactive"
  | "offline";

export type ConnectorHealthStatus =
  | "healthy"
  | "warning"
  | "degraded"
  | "offline"
  | "unknown";

export type PipelineStepState = "completed" | "waiting" | "mock" | "future";

export type ConnectorType =
  | "maps"
  | "search"
  | "website"
  | "social"
  | "geo"
  | "registry";

/**
 * Future live connector contract — not implemented in this phase.
 */
export interface Connector {
  id: string;
  code: string;
  name: string;
  version: string;
  type: ConnectorType;
  description: string;
  status: ConnectorStatus;
  capabilities: ConnectorCapabilities;
  configuration: ConnectorConfiguration;
}

export interface ConnectorCapabilities {
  supportsSearch: boolean;
  supportsFetch: boolean;
  supportsNormalize: boolean;
  supportsValidate: boolean;
  supportsEnrich: boolean;
  supportsRealtime: boolean;
  fields: string[];
}

export interface ConnectorConfiguration {
  enabled: boolean;
  mockMode: boolean;
  rateLimitPerMinute: number | null;
  timeoutMs: number | null;
  retryLimit: number;
  regionScope: string[];
  notes: string;
}

export interface ConnectorResult<T = Record<string, unknown>> {
  connectorId: string;
  success: boolean;
  data: T | null;
  confidence: number;
  fetchedAt: string;
  sourceUrl: string | null;
  errors: ConnectorError[];
}

export interface ConnectorHealth {
  connectorId: string;
  status: ConnectorHealthStatus;
  lastCheckedAt: string;
  message: string;
  uptimePercent: number;
}

export interface ConnectorStatistics {
  connectorId: string;
  totalRuns: number;
  successRate: number;
  averageRuntimeMs: number;
  averageConfidence: number;
  estimatedRecords: number;
  lastSyncAt: string | null;
}

export interface ConnectorRuntime {
  connectorId: string;
  queueStatus: ConnectorQueueStatus;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  currentStep: string | null;
}

export interface ConnectorError {
  code: string;
  message: string;
  retryable: boolean;
  occurredAt: string;
  details?: Record<string, unknown>;
}

export interface ConnectorMetrics {
  connectorId: string;
  confidence: number;
  coverage: number;
  freshness: number;
  reliability: number;
  completeness: number;
}

export type PipelineStepId =
  | "search"
  | "fetch"
  | "normalize"
  | "validate"
  | "store"
  | "enrich"
  | "crm";

export interface ConnectorPipelineStep {
  id: PipelineStepId;
  label: string;
  state: PipelineStepState;
}

/**
 * UI + catalog model for the Sources Center (mock-backed).
 */
export interface IntelligenceSourceCard {
  id: string;
  name: string;
  description: string;
  connectorType: ConnectorType;
  connectorName: string;
  version: string;
  badges: IntelligenceSourceBadge[];
  confidence: number;
  coverage: number;
  freshness: number;
  lastSyncAt: string | null;
  queueStatus: ConnectorQueueStatus;
  estimatedRecords: number;
  futureAvailability: string;
  averageRuntimeMs: number;
  averageConfidence: number;
  health: ConnectorHealthStatus;
  healthMessage: string;
  fields: string[];
  pipeline: ConnectorPipelineStep[];
  futureNotes: string;
}
