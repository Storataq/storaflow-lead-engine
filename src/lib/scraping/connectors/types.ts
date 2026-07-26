/**
 * Legacy connector types (job-engine adapter).
 * Prefer `@/lib/scraping/types/connector` for new code.
 */

import type { DiscoveredCompany, SearchInput } from "@/lib/scraping/types";

export type ConnectorCode = string;

export type ConnectorCapability =
  | "search_discovery"
  | "directory_listing"
  | "profile_enrichment"
  | "website_crawl"
  | "api_import";

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

export type ConnectorRegistry = {
  list(): ConnectorManifest[];
  get(code: ConnectorCode): ScrapeConnector | null;
  getOrThrow(code: ConnectorCode): ScrapeConnector;
};
