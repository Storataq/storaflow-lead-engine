/**
 * Boots the foundation ConnectorRegistry with MockConnector only.
 */

import { createMockConnector } from "@/lib/scraping/connectors/mock";
import { defaultConnectorRegistry } from "@/lib/scraping/connectors/registry";

let bootstrapped = false;

export function bootstrapFoundationConnectors(): void {
  if (bootstrapped) return;
  if (!defaultConnectorRegistry.has("mock")) {
    defaultConnectorRegistry.register(createMockConnector());
  }
  bootstrapped = true;
}

bootstrapFoundationConnectors();
