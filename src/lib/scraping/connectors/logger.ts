/**
 * Lightweight connector logger (foundation — no external services).
 */

export type ConnectorLogLevel = "debug" | "info" | "warn" | "error";

export type ConnectorLogEntry = {
  level: ConnectorLogLevel;
  connectorCode: string;
  message: string;
  at: string;
  meta?: Record<string, unknown>;
};

export interface ConnectorLogger {
  debug(connectorCode: string, message: string, meta?: Record<string, unknown>): void;
  info(connectorCode: string, message: string, meta?: Record<string, unknown>): void;
  warn(connectorCode: string, message: string, meta?: Record<string, unknown>): void;
  error(connectorCode: string, message: string, meta?: Record<string, unknown>): void;
  entries(): readonly ConnectorLogEntry[];
  clear(): void;
}

export class InMemoryConnectorLogger implements ConnectorLogger {
  private readonly buffer: ConnectorLogEntry[] = [];

  private push(
    level: ConnectorLogLevel,
    connectorCode: string,
    message: string,
    meta?: Record<string, unknown>,
  ): void {
    this.buffer.push({
      level,
      connectorCode,
      message,
      at: new Date().toISOString(),
      meta,
    });
  }

  debug(connectorCode: string, message: string, meta?: Record<string, unknown>): void {
    this.push("debug", connectorCode, message, meta);
  }

  info(connectorCode: string, message: string, meta?: Record<string, unknown>): void {
    this.push("info", connectorCode, message, meta);
  }

  warn(connectorCode: string, message: string, meta?: Record<string, unknown>): void {
    this.push("warn", connectorCode, message, meta);
  }

  error(connectorCode: string, message: string, meta?: Record<string, unknown>): void {
    this.push("error", connectorCode, message, meta);
  }

  entries(): readonly ConnectorLogEntry[] {
    return [...this.buffer];
  }

  clear(): void {
    this.buffer.length = 0;
  }
}

/** Shared default logger for foundation wiring. */
export const defaultConnectorLogger = new InMemoryConnectorLogger();
