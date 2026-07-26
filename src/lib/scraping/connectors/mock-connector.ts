/**
 * Mock connector — synthetic discovery only.
 * No network, no browser, no external APIs.
 */

import type {
  ConnectorManifest,
  ConnectorSearchContext,
  ConnectorSearchPage,
  ScrapeConnector,
} from "@/lib/scraping/connectors/types";
import type { DiscoveredCompany } from "@/lib/scraping/types";

const SUFFIXES = [
  "Group",
  "BV",
  "Ltd",
  "GmbH",
  "SAS",
  "Inc",
  "Partners",
  "Studio",
  "Services",
  "Solutions",
];

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function pick<T>(items: T[] | undefined, index: number, fallback: T): T {
  if (!items?.length) return fallback;
  return items[index % items.length] ?? fallback;
}

export const MOCK_CONNECTOR_MANIFEST: ConnectorManifest = {
  code: "mock",
  displayName: "Mock Connector",
  description:
    "Deterministic in-process discovery for foundation testing. No external I/O.",
  capabilities: ["search_discovery"],
  regions: [],
  supportsProxy: false,
  supportsRateLimit: false,
  supportsRetry: true,
  health: "ready",
};

export class MockScrapeConnector implements ScrapeConnector {
  readonly manifest = MOCK_CONNECTOR_MANIFEST;

  async searchPage(
    context: ConnectorSearchContext,
  ): Promise<ConnectorSearchPage> {
    const keyword =
      context.search.keywords?.[0] ?? context.search.keyword ?? "Business";
    const industry =
      context.search.industries?.[0] ??
      context.search.industry ??
      "professional_services";
    const country =
      context.search.countries?.[0] ?? context.search.country ?? "NL";
    const city = pick(
      context.search.cities,
      context.pageIndex,
      context.search.city ?? "Amsterdam",
    );
    const region = pick(
      context.search.regions,
      context.pageIndex,
      context.search.region ?? "",
    );

    const items: DiscoveredCompany[] = [];

    for (let i = 0; i < context.pageSize; i += 1) {
      const n = context.pageIndex * context.pageSize + i + 1;
      const suffix = pick(SUFFIXES, n, "Group");
      const companyName = `${keyword} ${suffix} ${n}`;
      const domain = `${slugify(companyName) || "mock-co"}.example`;
      const sourceUrl = `https://mock.lead-engine.local/jobs/${context.jobId}/page/${context.pageIndex + 1}/item/${i + 1}`;

      items.push({
        companyName,
        websiteUrl: `https://${domain}`,
        sourceUrl,
        sourceType: "search_result",
        city,
        region: region || undefined,
        country,
        industry,
      });
    }

    return {
      sourceCode: this.manifest.code,
      items,
      hasMore: true,
      meta: {
        mock: true,
        pageIndex: context.pageIndex,
        pageSize: context.pageSize,
      },
    };
  }
}

export const mockScrapeConnector = new MockScrapeConnector();
