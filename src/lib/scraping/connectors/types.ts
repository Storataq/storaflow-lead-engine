/**
 * Modular scrape connector contracts.
 *
 * Every future data source (Google Maps, LinkedIn, Yelp, registers, APIs, …)
 * implements the same interface. This phase ships contracts + a mock connector only.
 *
 * Designed for later: rate limits, proxies, retries, scheduling, worker nodes,
 * AI classification/ranking, and distributed cloud workers.
 */

import type { DiscoveredCompany, SearchInput } from "@/lib/scraping/types";

/** Stable connector id — stored on jobs/results as current_source_code / source_code. */
export type ConnectorCode = string;

export type ConnectorCapability =
  | "search_discovery"
  | "directory_listing"
  | "profile_enrichment"
  | "website_crawl"
  | "api_import";

export type ConnectorHealth = "ready" | "degraded" | "disabled" | "unimplemented";

/**
 * Static metadata for registry / UI. No network I/O.
 */
export type ConnectorManifest = {
  code: ConnectorCode;
  displayName: string;
  description: string;
  capabilities: ConnectorCapability[];
  /** ISO regions this connector typically covers; empty = worldwide. */
  regions: string[];
  /** Planned hooks — not implemented in this phase. */
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
  /** Page index for paginated discovery (0-based). */
  pageIndex: number;
  pageSize: number;
};

export type ConnectorSearchPage = {
  sourceCode: ConnectorCode;
  items: DiscoveredCompany[];
  hasMore: boolean;
  /** Optional diagnostics for logs / future observability. */
  meta?: Record<string, unknown>;
};

/**
 * Shared connector interface. Real adapters will implement this later.
 * Mock adapters return synthetic data only — never hit the network.
 */
export interface ScrapeConnector {
  readonly manifest: ConnectorManifest;

  /**
   * Discover companies for one page of a job.
   * Must be side-effect free regarding external systems in this phase.
   */
  searchPage(context: ConnectorSearchContext): Promise<ConnectorSearchPage>;
}

export type ConnectorRegistry = {
  list(): ConnectorManifest[];
  get(code: ConnectorCode): ScrapeConnector | null;
  getOrThrow(code: ConnectorCode): ScrapeConnector;
};
