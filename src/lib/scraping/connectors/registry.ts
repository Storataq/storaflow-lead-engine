/**
 * In-memory connector registry with simple dependency-friendly API.
 */

import type { Connector } from "@/lib/scraping/connectors/connector";
import { ConnectorNotFoundError } from "@/lib/scraping/connectors/errors";
import type { ConnectorCode } from "@/lib/scraping/connectors/types";

export class ConnectorRegistry {
  private readonly connectors = new Map<ConnectorCode, Connector>();

  register(connector: Connector): void {
    this.connectors.set(connector.code, connector);
  }

  unregister(code: ConnectorCode): boolean {
    return this.connectors.delete(code);
  }

  has(code: ConnectorCode): boolean {
    return this.connectors.has(code);
  }

  get(code: ConnectorCode): Connector | null {
    return this.connectors.get(code) ?? null;
  }

  getOrThrow(code: ConnectorCode): Connector {
    const connector = this.get(code);
    if (!connector) {
      throw new ConnectorNotFoundError(code);
    }
    return connector;
  }

  list(): Connector[] {
    return [...this.connectors.values()].sort((a, b) =>
      a.name.localeCompare(b.name, "en"),
    );
  }

  clear(): void {
    this.connectors.clear();
  }
}

/** Process-wide registry instance (injectable into the factory). */
export const defaultConnectorRegistry = new ConnectorRegistry();
