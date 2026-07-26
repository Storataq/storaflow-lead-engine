/**
 * In-process connector registry.
 *
 * Today: mock connector is executable; planned connectors are manifests only.
 * Later: worker nodes resolve connectors by code, apply rate limits / proxies.
 */

import { PLANNED_CONNECTOR_MANIFESTS } from "@/lib/scraping/connectors/catalog";
import { mockScrapeConnector } from "@/lib/scraping/connectors/mock-connector";
import type {
  ConnectorCode,
  ConnectorManifest,
  ConnectorRegistry,
  ScrapeConnector,
} from "@/lib/scraping/connectors/types";

const executable = new Map<ConnectorCode, ScrapeConnector>([
  [mockScrapeConnector.manifest.code, mockScrapeConnector],
]);

export function listConnectorManifests(): ConnectorManifest[] {
  const plannedCodes = new Set(PLANNED_CONNECTOR_MANIFESTS.map((m) => m.code));
  const manifests: ConnectorManifest[] = [
    mockScrapeConnector.manifest,
    ...PLANNED_CONNECTOR_MANIFESTS,
  ];

  // Prefer executable health when a planned code later gains an adapter.
  return manifests.map((manifest) => {
    const live = executable.get(manifest.code);
    if (!live) return manifest;
    if (plannedCodes.has(manifest.code) && manifest.code !== "mock") {
      return { ...manifest, health: live.manifest.health };
    }
    return live.manifest;
  });
}

export function getConnector(code: ConnectorCode): ScrapeConnector | null {
  return executable.get(code) ?? null;
}

export function getConnectorOrThrow(code: ConnectorCode): ScrapeConnector {
  const connector = getConnector(code);
  if (!connector) {
    throw new Error(
      `Connector "${code}" is not implemented yet (mock-only foundation).`,
    );
  }
  return connector;
}

/**
 * Resolve which connector to run for a job.
 * Prefer an enabled search_queries.sources code if implemented; else mock.
 */
export function resolveJobConnector(
  preferredSourceCodes: string[] | null | undefined,
): ScrapeConnector {
  for (const code of preferredSourceCodes ?? []) {
    const connector = getConnector(code);
    if (connector) return connector;
  }
  return mockScrapeConnector;
}

export const connectorRegistry: ConnectorRegistry = {
  list: listConnectorManifests,
  get: getConnector,
  getOrThrow: getConnectorOrThrow,
};
