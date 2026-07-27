/**
 * Shared /api/v1 request handler wrapper.
 */

import type { NextResponse } from "next/server";

import {
  authenticateApiRequest,
  logApiRequest,
  type ApiAuthContext,
} from "@/lib/platform-api/auth";
import { apiError } from "@/lib/platform-api/responses";
import type { ApiScope } from "@/lib/platform-api/constants";
import { registerWebhookEventListener } from "@/lib/platform-api/delivery";

let listenersReady = false;
function ensureListeners() {
  if (!listenersReady) {
    registerWebhookEventListener();
    listenersReady = true;
  }
}

export async function withApiHandler(
  request: Request,
  requiredScope: ApiScope | ApiScope[] | undefined,
  handler: (ctx: ApiAuthContext) => Promise<NextResponse>,
): Promise<NextResponse> {
  ensureListeners();
  const started = Date.now();
  const auth = await authenticateApiRequest(request, requiredScope);
  if (!auth.ok) return auth.response;

  try {
    const response = await handler(auth.ctx);
    const url = new URL(request.url);
    await logApiRequest({
      ctx: auth.ctx,
      method: request.method,
      path: url.pathname,
      statusCode: response.status,
      latencyMs: Date.now() - started,
      request,
    });
    response.headers.set(
      "X-RateLimit-Remaining",
      String(auth.ctx.rateLimitRemaining),
    );
    response.headers.set(
      "X-RateLimit-Limit",
      String(auth.ctx.apiKey.rate_limit_per_day),
    );
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected API error";
    const response = apiError("internal_error", message, {
      requestId: auth.ctx.requestId,
    });
    await logApiRequest({
      ctx: auth.ctx,
      method: request.method,
      path: new URL(request.url).pathname,
      statusCode: 500,
      latencyMs: Date.now() - started,
      errorCode: "internal_error",
      request,
    });
    return response;
  }
}
