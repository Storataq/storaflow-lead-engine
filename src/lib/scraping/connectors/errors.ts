/**
 * Connector error hierarchy for the foundation framework.
 */

import type { ConnectorCode } from "@/lib/scraping/connectors/types";

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

export class ConnectorNotFoundError extends ConnectorError {
  constructor(connectorCode: string) {
    super(`Connector "${connectorCode}" is not registered`, {
      code: "CONNECTOR_NOT_FOUND",
      connectorCode,
      retryable: false,
    });
    this.name = "ConnectorNotFoundError";
  }
}

export class ConnectorValidationError extends ConnectorError {
  constructor(message: string, connectorCode?: ConnectorCode) {
    super(message, {
      code: "CONNECTOR_VALIDATION_ERROR",
      connectorCode,
      retryable: false,
    });
    this.name = "ConnectorValidationError";
  }
}

export class ConnectorNotConnectedError extends ConnectorError {
  constructor(connectorCode: ConnectorCode) {
    super(`Connector "${connectorCode}" is not connected`, {
      code: "CONNECTOR_NOT_CONNECTED",
      connectorCode,
      retryable: true,
    });
    this.name = "ConnectorNotConnectedError";
  }
}
