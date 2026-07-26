/**
 * Boots the foundation ConnectorRegistry with Mock, Google Maps (mock), and OpenStreetMap (live).
 */

import { createGoogleMapsConnector } from "@/lib/scraping/connectors/google-maps";
import { createMockConnector } from "@/lib/scraping/connectors/mock";
import { createOpenStreetMapConnector } from "@/lib/scraping/connectors/openstreetmap";
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

  if (!defaultConnectorRegistry.has("openstreetmap")) {
    defaultConnectorRegistry.register(createOpenStreetMapConnector());
  }

  bootstrapped = true;
}

bootstrapFoundationConnectors();
