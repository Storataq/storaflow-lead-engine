/**
 * Compatibility layer for existing job engine imports.
 * Foundation (fase 7): also exports Connector / ConnectorFactory / registry.
 */

import "@/lib/scraping/registry/register-defaults";
import "@/lib/scraping/connectors/bootstrap";

import type {
  ConnectorCapability,
  ConnectorCode,
  ConnectorHealth,
  ConnectorManifest,
  ConnectorRegistry as ScrapeConnectorRegistryType,
  ConnectorSearchContext,
  ConnectorSearchPage,
  ScrapeConnector,
} from "@/lib/scraping/connectors/types";
import {
  getRegisteredConnector,
  getRegisteredConnectorOrThrow,
  listRegisteredConnectors,
  listRegisteredManifests,
} from "@/lib/scraping/registry/store";
import type {
  Connector as FrameworkModuleConnector,
  ConnectorJob,
  ConnectorManifest as NewManifest,
  ConnectorResult,
  ConnectorSearchPage as NewSearchPage,
} from "@/lib/scraping/types/connector";

export type {
  ConnectorCapability,
  ConnectorCode,
  ConnectorHealth,
  ConnectorManifest,
  ConnectorSearchContext,
  ConnectorSearchPage,
  ScrapeConnector,
};

/** @deprecated Prefer ScrapeConnectorRegistry from types */
export type ConnectorRegistry = ScrapeConnectorRegistryType;

export type { Connector } from "@/lib/scraping/connectors/connector";
export type { ConnectorCapabilities } from "@/lib/scraping/connectors/capabilities";
export {
  ConnectorFactory,
  defaultConnectorFactory,
} from "@/lib/scraping/connectors/factory";
export {
  ConnectorRegistry as FoundationConnectorRegistry,
  defaultConnectorRegistry,
} from "@/lib/scraping/connectors/registry";
export {
  MockConnector,
  createMockConnector,
} from "@/lib/scraping/connectors/mock";
export {
  GoogleMapsConnector,
  createGoogleMapsConnector,
  GOOGLE_MAPS_CONNECTOR_CODE,
  runGoogleMapsMockTest,
  GOOGLE_MAPS_CAPABILITY_PROFILE,
  type GoogleMapsConnectorConfig,
} from "@/lib/scraping/connectors/google-maps";
export {
  OpenStreetMapConnector,
  createOpenStreetMapConnector,
  OPENSTREETMAP_CONNECTOR_CODE,
  OPENSTREETMAP_CAPABILITIES,
} from "@/lib/scraping/connectors/openstreetmap";
export {
  runConnectorPipeline,
  runConnectorPipelineDetailed,
} from "@/lib/scraping/connectors/pipeline";
export type {
  ConnectorCancellation,
  ConnectorExecutionContext,
  ConnectorPagination,
  ConnectorRateLimitInfo,
  ConnectorRetryPolicy,
  ConnectorRunStatistics,
  LiveScraperPipelineStep,
} from "@/lib/scraping/connectors/readiness";
export {
  LIVE_SCRAPER_PIPELINE_STEPS,
} from "@/lib/scraping/connectors/readiness";
export {
  enrichWithAiPlaceholder,
  deduplicateBusinessResults,
  normalizeBusinessResults,
  parseSearchHits,
  parseSearchResults,
  runProcessingPipeline,
  validateBusinessResults,
} from "@/lib/scraping/connectors/pipeline/index";
export {
  MockTestService,
  defaultMockTestService,
  runMockPipelineTest,
} from "@/lib/scraping/connectors/mock-test-service";
export {
  ConnectorError,
  ConnectorNotFoundError,
  ConnectorValidationError,
  ConnectorNotConnectedError,
} from "@/lib/scraping/connectors/errors";
export {
  defaultConnectorLogger,
  InMemoryConnectorLogger,
} from "@/lib/scraping/connectors/logger";
export type {
  NormalizedBusinessResult,
  MockPipelineRunSummary,
  ValidationIssue,
} from "@/lib/scraping/connectors/types";

function toLegacyManifest(manifest: NewManifest): ConnectorManifest {
  return {
    code: manifest.code,
    displayName: manifest.name,
    description: manifest.description,
    capabilities: ["search_discovery"],
    regions: manifest.capabilities.supportedCountries,
    supportsProxy: manifest.capabilities.requiresProxy,
    supportsRateLimit: true,
    supportsRetry: true,
    health: manifest.health,
  };
}

function toDiscovered(item: ConnectorResult) {
  return {
    companyName: item.companyName,
    websiteUrl: item.website ?? undefined,
    sourceUrl: item.sourceUrl,
    sourceType: "search_result" as const,
    city: item.city ?? undefined,
    region: item.region ?? undefined,
    country: item.country ?? undefined,
    industry: item.category ?? undefined,
  };
}

function adaptConnector(connector: FrameworkModuleConnector): ScrapeConnector {
  return {
    get manifest() {
      return toLegacyManifest(connector.manifest);
    },
    async searchPage(context: ConnectorSearchContext): Promise<ConnectorSearchPage> {
      const job: ConnectorJob = {
        organizationId: context.organizationId,
        jobId: context.jobId,
        keywords: context.search.keywords ?? [context.search.keyword],
        countries:
          context.search.countries ??
          (context.search.country ? [context.search.country] : []),
        cities:
          context.search.cities ??
          (context.search.city ? [context.search.city] : []),
        regions:
          context.search.regions ??
          (context.search.region ? [context.search.region] : []),
        languages: context.search.languages ?? [],
        industries:
          context.search.industries ??
          (context.search.industry ? [context.search.industry] : []),
        searchPrompt: context.search.searchPrompt,
        pageIndex: context.pageIndex,
        pageSize: context.pageSize,
      };

      const page: NewSearchPage = await connector.searchPage(job);
      return {
        sourceCode: page.sourceCode,
        items: page.items.map(toDiscovered),
        hasMore: page.hasMore,
        meta: page.meta,
      };
    },
  };
}

export function listConnectorManifests(): ConnectorManifest[] {
  return listRegisteredManifests().map(toLegacyManifest);
}

export function getConnector(code: ConnectorCode): ScrapeConnector | null {
  const connector = getRegisteredConnector(code);
  return connector ? adaptConnector(connector) : null;
}

export function getConnectorOrThrow(code: ConnectorCode): ScrapeConnector {
  return adaptConnector(getRegisteredConnectorOrThrow(code));
}

export function resolveJobConnector(
  preferredSourceCodes: string[] | null | undefined,
): ScrapeConnector {
  for (const code of preferredSourceCodes ?? []) {
    const connector = getConnector(code);
    if (connector) return connector;
  }
  return getConnectorOrThrow("mock");
}

export const connectorRegistry: ScrapeConnectorRegistryType = {
  list: listConnectorManifests,
  get: getConnector,
  getOrThrow: getConnectorOrThrow,
};

export const PLANNED_CONNECTOR_MANIFESTS = listConnectorManifests().filter(
  (item) => item.code !== "mock",
);

export const mockScrapeConnector = getConnectorOrThrow("mock");

export function listFrameworkConnectors(): FrameworkModuleConnector[] {
  return listRegisteredConnectors();
}
