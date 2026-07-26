/**
 * Connector contract — every future provider implements this interface.
 * No network I/O in the foundation phase.
 */

import type { ConnectorCapabilities } from "@/lib/scraping/connectors/capabilities";
import type {
  ConnectorCode,
  ConnectorSearchHit,
  ConnectorSearchInput,
  ConnectorSearchResponse,
  ConnectorStatus,
  HealthStatus,
} from "@/lib/scraping/connectors/types";

export interface Connector {
  readonly code: ConnectorCode;
  readonly name: string;
  readonly capabilities: ConnectorCapabilities;
  readonly status: ConnectorStatus;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  search(input: ConnectorSearchInput): Promise<ConnectorSearchResponse>;
  validate(input: ConnectorSearchInput): Promise<boolean>;
  normalize(hits: ConnectorSearchHit[]): Promise<ConnectorSearchResponse>;
  healthCheck(): Promise<HealthStatus>;
}
