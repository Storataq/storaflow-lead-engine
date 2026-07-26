/**
 * Public registry entrypoint.
 */

import "@/lib/scraping/registry/register-defaults";

export {
  connectorRegistry,
  getRegisteredConnector,
  getRegisteredConnectorOrThrow,
  hasRegisteredConnector,
  listRegisteredConnectors,
  listRegisteredManifests,
  registerConnector,
} from "@/lib/scraping/registry/store";
