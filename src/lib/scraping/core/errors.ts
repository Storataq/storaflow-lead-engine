/**
 * Centralized connector error hierarchy.
 * Ready for network/proxy/rate-limit failures when live connectors land.
 */

import type { ConnectorCode } from "@/lib/scraping/types/connector";

export class ConnectorError extends Error {
  readonly code: string;
  readonly connectorCode?: ConnectorCode;
  readonly retryable: boolean;

  constructor(
    message: string,
    options?: {
      code?: string;
      connectorCode?: ConnectorCode;
      retryable?: boolean;
      cause?: unknown;
    },
  ) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = "ConnectorError";
    this.code = options?.code ?? "CONNECTOR_ERROR";
    this.connectorCode = options?.connectorCode;
    this.retryable = options?.retryable ?? false;
  }
}

export class NetworkError extends ConnectorError {
  constructor(message: string, connectorCode?: ConnectorCode, cause?: unknown) {
    super(message, {
      code: "NETWORK_ERROR",
      connectorCode,
      retryable: true,
      cause,
    });
    this.name = "NetworkError";
  }
}

export class RateLimitError extends ConnectorError {
  constructor(message: string, connectorCode?: ConnectorCode, cause?: unknown) {
    super(message, {
      code: "RATE_LIMIT",
      connectorCode,
      retryable: true,
      cause,
    });
    this.name = "RateLimitError";
  }
}

export class ProxyError extends ConnectorError {
  constructor(message: string, connectorCode?: ConnectorCode, cause?: unknown) {
    super(message, {
      code: "PROXY_ERROR",
      connectorCode,
      retryable: true,
      cause,
    });
    this.name = "ProxyError";
  }
}

export class ParsingError extends ConnectorError {
  constructor(message: string, connectorCode?: ConnectorCode, cause?: unknown) {
    super(message, {
      code: "PARSING_ERROR",
      connectorCode,
      retryable: false,
      cause,
    });
    this.name = "ParsingError";
  }
}

export class AuthenticationError extends ConnectorError {
  constructor(message: string, connectorCode?: ConnectorCode, cause?: unknown) {
    super(message, {
      code: "AUTHENTICATION_ERROR",
      connectorCode,
      retryable: false,
      cause,
    });
    this.name = "AuthenticationError";
  }
}

export class TimeoutError extends ConnectorError {
  constructor(message: string, connectorCode?: ConnectorCode, cause?: unknown) {
    super(message, {
      code: "TIMEOUT_ERROR",
      connectorCode,
      retryable: true,
      cause,
    });
    this.name = "TimeoutError";
  }
}
