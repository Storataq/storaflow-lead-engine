/**
 * Consistent versioned API response helpers.
 */

import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import type { ApiErrorCode } from "@/lib/platform-api/constants";

export type { ListQuery } from "@/lib/platform-api/list-query";
export {
  parseListQuery,
  paginationMeta,
} from "@/lib/platform-api/list-query";

export type ApiSuccessBody<T> = {
  status: "ok";
  data: T;
  meta?: Record<string, unknown>;
  requestId: string;
  timestamp: string;
};

export type ApiErrorBody = {
  status: "error";
  error: {
    code: ApiErrorCode;
    message: string;
    validationErrors?: Array<{ field: string; message: string }>;
  };
  requestId: string;
  timestamp: string;
};

export function newRequestId(): string {
  return randomUUID();
}

export function apiSuccess<T>(
  data: T,
  init?: {
    status?: number;
    meta?: Record<string, unknown>;
    requestId?: string;
    headers?: HeadersInit;
  },
) {
  const requestId = init?.requestId ?? newRequestId();
  const body: ApiSuccessBody<T> = {
    status: "ok",
    data,
    meta: init?.meta,
    requestId,
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: {
      "X-Request-Id": requestId,
      "X-API-Version": "v1",
      ...Object.fromEntries(new Headers(init?.headers).entries()),
    },
  });
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  init?: {
    status?: number;
    requestId?: string;
    validationErrors?: Array<{ field: string; message: string }>;
    headers?: HeadersInit;
  },
) {
  const requestId = init?.requestId ?? newRequestId();
  const status =
    init?.status ??
    (code === "unauthorized"
      ? 401
      : code === "forbidden" || code === "missing_scope"
        ? 403
        : code === "not_found"
          ? 404
          : code === "rate_limited"
            ? 429
            : code === "validation_error"
              ? 422
              : code === "conflict"
                ? 409
                : 500);

  const body: ApiErrorBody = {
    status: "error",
    error: {
      code,
      message,
      validationErrors: init?.validationErrors,
    },
    requestId,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(body, {
    status,
    headers: {
      "X-Request-Id": requestId,
      "X-API-Version": "v1",
      ...Object.fromEntries(new Headers(init?.headers).entries()),
    },
  });
}
