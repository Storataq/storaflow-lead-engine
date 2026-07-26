/**
 * Worker stubs for future distributed connector workers.
 * Job execution today lives in `src/lib/jobs/workers` (MockWorker).
 */

import type { Connector, ConnectorCode } from "@/lib/scraping/types/connector";

export type ConnectorWorkerCode = ConnectorCode;

export interface ConnectorWorker {
  readonly code: ConnectorWorkerCode;
  readonly connector: Connector;
  /** Reserved for cloud/queue workers. */
  canProcess(jobId: string): boolean;
}

export class MockConnectorWorker implements ConnectorWorker {
  readonly code: ConnectorWorkerCode;
  readonly connector: Connector;

  constructor(connector: Connector) {
    this.connector = connector;
    this.code = connector.manifest.code;
  }

  canProcess(): boolean {
    return this.connector.manifest.health === "ready";
  }
}
