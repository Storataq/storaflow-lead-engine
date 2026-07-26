/**
 * Boots the foundation ConnectorRegistry with Mock + Google Maps.
 * Does not change the registry implementation — only registration.
 */

import { createGoogleMapsConnector } from "@/lib/scraping/connectors/google-maps";
import { createMockConnector } from "@/lib/scraping/connectors/mock";
import { defaultConnectorRegistry } from "@/lib/scraping/connectors/registry";

let bootstrapped = false;

export function bootstrapFoundationConnectors(): void {
  if (bootstrapped) return;

  if (!defaultConnectorRegistry.has("mock")) {
    defaultConnectorRegistry.register(createMockConnector());
  }

  if (!defaultConnectorRegistry.has("google_maps")) {
    defaultConnectorRegistry.register(createGoogleMapsConnector());
  }

  bootstrapped = true;
}

bootstrapFoundationConnectors();
