/**
 * Connector factory — resolves connectors by code via an injected registry.
 */

import type { Connector } from "@/lib/scraping/connectors/connector";
import {
  ConnectorRegistry,
  defaultConnectorRegistry,
} from "@/lib/scraping/connectors/registry";
import type { ConnectorCode } from "@/lib/scraping/connectors/types";

export type ConnectorFactoryOptions = {
  registry?: ConnectorRegistry;
};

export class ConnectorFactory {
  private readonly registry: ConnectorRegistry;

  constructor(options: ConnectorFactoryOptions = {}) {
    this.registry = options.registry ?? defaultConnectorRegistry;
  }

  create(code: ConnectorCode): Connector {
    return this.registry.getOrThrow(code);
  }

  tryCreate(code: ConnectorCode): Connector | null {
    return this.registry.get(code);
  }

  list(): Connector[] {
    return this.registry.list();
  }
}

export const defaultConnectorFactory = new ConnectorFactory({
  registry: defaultConnectorRegistry,
});
