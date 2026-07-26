/**
 * Foundation connector value types (fase 7 stap 1).
 * Legacy job-adapter types remain below for backward compatibility.
 */

import type { ConnectorLogEntry } from "@/lib/scraping/connectors/logger";
import type { DiscoveredCompany, SearchInput } from "@/lib/scraping/types";

/** Stable connector identifier, e.g. "mock". */
export type ConnectorCode = string;

export type ConnectorStatus = "idle" | "connected" | "disconnected" | "error";

export type HealthStatus = "healthy" | "degraded" | "unhealthy";

/**
 * Search input accepted by Connector.search().
 */
export type ConnectorSearchInput = {
  query: string;
  countries?: string[];
  cities?: string[];
  regions?: string[];
  languages?: string[];
  limit?: number;
};

/**
 * Uniform raw hit before parser/normalize().
 */
export type ConnectorSearchHit = {
  sourceId?: string;
  name: string;
  website?: string | null;
  emails?: string[];
  phones?: string[];
  /** @deprecated Prefer emails[] */
  email?: string | null;
  /** @deprecated Prefer phones[] */
  phone?: string | null;
  street?: string | null;
  postalCode?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  countryCode?: string | null;
  industry?: string | null;
  categories?: string[];
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  confidence?: number;
  sourceUrl: string;
  raw?: Record<string, unknown>;
};

/**
 * Uniform normalized business result used by the processing pipeline.
 */
export type NormalizedBusinessResult = {
  source: string;
  sourceId: string;
  name: string;
  website: string | null;
  emails: string[];
  phones: string[];
  street: string | null;
  postalCode: string | null;
  city: string | null;
  region: string | null;
  countryCode: string | null;
  industry: string | null;
  categories: string[];
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  confidence: number;
  rawData: Record<string, unknown>;
};

/** Alias — connector.search()/normalize() return the uniform model. */
export type ConnectorSearchResult = NormalizedBusinessResult;

export type ConnectorSearchResponse = {
  connectorCode: ConnectorCode;
  results: ConnectorSearchResult[];
  total: number;
};

export type ValidationIssue = {
  sourceId: string;
  field: string;
  message: string;
};

export type ValidationOutcome = {
  valid: NormalizedBusinessResult[];
  invalid: NormalizedBusinessResult[];
  issues: ValidationIssue[];
};

export type DeduplicationOutcome = {
  results: NormalizedBusinessResult[];
  duplicatesRemoved: number;
};

export type MockPipelineRunSummary = {
  connectorCode: ConnectorCode;
  fetchedCount: number;
  validCount: number;
  invalidCount: number;
  duplicatesRemoved: number;
  results: NormalizedBusinessResult[];
  runtimeMs: number;
  logs: ConnectorLogEntry[];
  issues: ValidationIssue[];
};

// ---------------------------------------------------------------------------
// Legacy job-engine adapter types (do not remove — used by scrape jobs)
// ---------------------------------------------------------------------------

export type LegacyConnectorCapability =
  | "search_discovery"
  | "directory_listing"
  | "profile_enrichment"
  | "website_crawl"
  | "api_import";

/** @deprecated Prefer LegacyConnectorCapability */
export type ConnectorCapability = LegacyConnectorCapability;

export type ConnectorHealth =
  | "ready"
  | "degraded"
  | "disabled"
  | "unimplemented";

export type ConnectorManifest = {
  code: ConnectorCode;
  displayName: string;
  description: string;
  capabilities: ConnectorCapability[];
  regions: string[];
  supportsProxy: boolean;
  supportsRateLimit: boolean;
  supportsRetry: boolean;
  health: ConnectorHealth;
};

export type ConnectorSearchContext = {
  organizationId: string;
  jobId: string;
  search: SearchInput & {
    keywords?: string[];
    countries?: string[];
    cities?: string[];
    regions?: string[];
    languages?: string[];
    industries?: string[];
    sources?: string[];
    searchPrompt?: string | null;
  };
  pageIndex: number;
  pageSize: number;
};

export type ConnectorSearchPage = {
  sourceCode: ConnectorCode;
  items: DiscoveredCompany[];
  hasMore: boolean;
  meta?: Record<string, unknown>;
};

export interface ScrapeConnector {
  readonly manifest: ConnectorManifest;
  searchPage(context: ConnectorSearchContext): Promise<ConnectorSearchPage>;
}

/** Legacy registry shape used by the job adapter barrel. */
export type ScrapeConnectorRegistry = {
  list(): ConnectorManifest[];
  get(code: ConnectorCode): ScrapeConnector | null;
  getOrThrow(code: ConnectorCode): ScrapeConnector;
};

/** @deprecated Prefer ScrapeConnectorRegistry */
export type ConnectorRegistry = ScrapeConnectorRegistry;
