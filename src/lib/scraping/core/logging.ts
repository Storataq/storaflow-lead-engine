/**
 * In-memory connector logging helpers (UI mock tests + future workers).
 */

import type {
  ConnectorCode,
  ConnectorLogEntry,
  ConnectorLogEvent,
} from "@/lib/scraping/types/connector";

export function createConnectorLog(
  connectorCode: ConnectorCode,
  event: ConnectorLogEvent,
  message: string,
  meta?: Record<string, unknown>,
): ConnectorLogEntry {
  return {
    connectorCode,
    event,
    message,
    at: new Date().toISOString(),
    meta,
  };
}

export class ConnectorLogBuffer {
  private readonly entries: ConnectorLogEntry[] = [];

  log(
    connectorCode: ConnectorCode,
    event: ConnectorLogEvent,
    message: string,
    meta?: Record<string, unknown>,
  ): ConnectorLogEntry {
    const entry = createConnectorLog(connectorCode, event, message, meta);
    this.entries.push(entry);
    return entry;
  }

  all(): ConnectorLogEntry[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries.length = 0;
  }
}
