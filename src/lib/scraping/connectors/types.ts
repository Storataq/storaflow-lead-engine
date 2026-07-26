/**
 * Foundation connector value types (fase 7 stap 1).
 * Legacy job-adapter types remain below for backward compatibility.
 */

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
 * Uniform raw hit before normalize().
 */
export type ConnectorSearchHit = {
  name: string;
  website?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  sourceUrl: string;
  raw?: Record<string, unknown>;
};

/**
 * Normalized company-shaped result returned to callers.
 */
export type ConnectorSearchResult = {
  companyName: string;
  website: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  sourceUrl: string;
  sourceCode: ConnectorCode;
};

export type ConnectorSearchResponse = {
  connectorCode: ConnectorCode;
  results: ConnectorSearchResult[];
  total: number;
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
