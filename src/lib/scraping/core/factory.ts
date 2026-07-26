/**
 * Connector factory — creates instances from the registry (or by code later).
 */

import type {
  Connector,
  ConnectorCode,
  ConnectorFactory,
} from "@/lib/scraping/types/connector";
import { getRegisteredConnector } from "@/lib/scraping/registry/store";

export class DefaultConnectorFactory implements ConnectorFactory {
  create(code: ConnectorCode): Connector | null {
    return getRegisteredConnector(code);
  }
}

export const connectorFactory = new DefaultConnectorFactory();
