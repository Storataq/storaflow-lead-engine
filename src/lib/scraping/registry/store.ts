/**
 * Mutable in-process connector registry store.
 * New connectors register here once — no edits to callers required.
 */

import { ConnectorError } from "@/lib/scraping/core/errors";
import type {
  Connector,
  ConnectorCode,
  ConnectorManifest,
  ConnectorRegistry,
} from "@/lib/scraping/types/connector";

const connectors = new Map<ConnectorCode, Connector>();

export function registerConnector(connector: Connector): void {
  connectors.set(connector.manifest.code, connector);
}

export function getRegisteredConnector(code: ConnectorCode): Connector | null {
  return connectors.get(code) ?? null;
}

export function listRegisteredConnectors(): Connector[] {
  return [...connectors.values()].sort((a, b) =>
    a.manifest.name.localeCompare(b.manifest.name, "en"),
  );
}

export function listRegisteredManifests(): ConnectorManifest[] {
  return listRegisteredConnectors().map((connector) => connector.manifest);
}

export function hasRegisteredConnector(code: ConnectorCode): boolean {
  return connectors.has(code);
}

export function getRegisteredConnectorOrThrow(code: ConnectorCode): Connector {
  const connector = getRegisteredConnector(code);
  if (!connector) {
    throw new ConnectorError(`Connector "${code}" is not registered`, {
      code: "CONNECTOR_NOT_FOUND",
      connectorCode: code,
    });
  }
  return connector;
}

export const connectorRegistry: ConnectorRegistry = {
  register: registerConnector,
  list: listRegisteredConnectors,
  listManifests: listRegisteredManifests,
  get: getRegisteredConnector,
  getOrThrow: getRegisteredConnectorOrThrow,
  has: hasRegisteredConnector,
};
