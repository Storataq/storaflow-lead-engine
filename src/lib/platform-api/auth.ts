/**
 * Authenticate public /api/v1 requests via Bearer / X-API-Key.
 */

import {
  extractBearerToken,
  hashApiKey,
} from "@/lib/platform-api/keys";
import {
  checkMinuteRateLimit,
  utcUsageDate,
} from "@/lib/platform-api/rate-limit";
import { apiError, newRequestId } from "@/lib/platform-api/responses";
import { hasScope, parseScopesJson } from "@/lib/platform-api/scopes";
import type { ApiScope } from "@/lib/platform-api/constants";
import { createServiceClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/supabase";

export type PlatformApiKeyRow =
  Database["public"]["Tables"]["platform_api_keys"]["Row"];

export type ApiAuthContext = {
  requestId: string;
  organizationId: string;
  apiKey: PlatformApiKeyRow;
  scopes: string[];
  rateLimitRemaining: number;
  rateLimitResetAt: number;
};

export async function authenticateApiRequest(
  request: Request,
  requiredScope?: ApiScope | ApiScope[],
): Promise<
  | { ok: true; ctx: ApiAuthContext }
  | { ok: false; response: ReturnType<typeof apiError> }
> {
  const requestId = newRequestId();
  const token = extractBearerToken(request);
  if (!token) {
    return {
      ok: false,
      response: apiError("unauthorized", "Missing API key.", {
        requestId,
        status: 401,
      }),
    };
  }

  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    return {
      ok: false,
      response: apiError(
        "internal_error",
        "API platform is not configured (service role).",
        { requestId },
      ),
    };
  }

  const keyHash = hashApiKey(token);
  const { data: apiKey, error } = await supabase
    .from("platform_api_keys")
    .select("*")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (error || !apiKey) {
    try {
      // Cannot know org — skip audit org insert
    } catch {
      /* */
    }
    return {
      ok: false,
      response: apiError("unauthorized", "Invalid API key.", { requestId }),
    };
  }

  if (apiKey.status === "revoked" || apiKey.status === "rotated") {
    return {
      ok: false,
      response: apiError("revoked_key", "API key has been revoked.", {
        requestId,
        status: 401,
      }),
    };
  }

  if (apiKey.expires_at && new Date(apiKey.expires_at).getTime() < Date.now()) {
    await supabase
      .from("platform_api_keys")
      .update({ status: "expired" })
      .eq("id", apiKey.id);
    return {
      ok: false,
      response: apiError("expired_key", "API key has expired.", {
        requestId,
        status: 401,
      }),
    };
  }

  if (apiKey.status !== "active") {
    return {
      ok: false,
      response: apiError("unauthorized", "API key is not active.", {
        requestId,
      }),
    };
  }

  const scopes = parseScopesJson(apiKey.scopes_json);
  if (requiredScope && !hasScope(scopes, requiredScope)) {
    return {
      ok: false,
      response: apiError(
        "missing_scope",
        "API key is missing the required scope.",
        { requestId, status: 403 },
      ),
    };
  }

  const minute = checkMinuteRateLimit({
    keyId: apiKey.id,
    limit: apiKey.rate_limit_per_minute,
  });

  const usageDate = utcUsageDate();
  const { data: usage } = await supabase
    .from("platform_api_usage_daily")
    .select("request_count, rate_limit_429_count")
    .eq("organization_id", apiKey.organization_id)
    .eq("api_key_id", apiKey.id)
    .eq("usage_date", usageDate)
    .maybeSingle();

  const usedToday = usage?.request_count ?? 0;
  if (usedToday >= apiKey.rate_limit_per_day || !minute.allowed) {
    await bumpUsage({
      supabase,
      organizationId: apiKey.organization_id,
      apiKeyId: apiKey.id,
      usageDate,
      is429: true,
    });
    return {
      ok: false,
      response: apiError("rate_limited", "Rate limit exceeded.", {
        requestId,
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(apiKey.rate_limit_per_day),
          "X-RateLimit-Remaining": "0",
          "Retry-After": String(
            Math.max(1, Math.ceil((minute.resetAt - Date.now()) / 1000)),
          ),
        },
      }),
    };
  }

  await supabase
    .from("platform_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiKey.id);

  return {
    ok: true,
    ctx: {
      requestId,
      organizationId: apiKey.organization_id,
      apiKey,
      scopes,
      rateLimitRemaining: Math.max(
        0,
        Math.min(minute.remaining, apiKey.rate_limit_per_day - usedToday - 1),
      ),
      rateLimitResetAt: minute.resetAt,
    },
  };
}

export async function logApiRequest(input: {
  ctx: ApiAuthContext;
  method: string;
  path: string;
  statusCode: number;
  latencyMs: number;
  errorCode?: string | null;
  request: Request;
}) {
  try {
    const supabase = createServiceClient();
    await supabase.from("platform_api_request_logs").insert({
      organization_id: input.ctx.organizationId,
      api_key_id: input.ctx.apiKey.id,
      request_id: input.ctx.requestId,
      method: input.method,
      path: input.path,
      status_code: input.statusCode,
      latency_ms: input.latencyMs,
      error_code: input.errorCode ?? null,
      ip_address:
        input.request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        null,
      user_agent: input.request.headers.get("user-agent"),
    });
    await bumpUsage({
      supabase,
      organizationId: input.ctx.organizationId,
      apiKeyId: input.ctx.apiKey.id,
      usageDate: utcUsageDate(),
      isError: input.statusCode >= 400,
      is429: input.statusCode === 429,
    });
  } catch {
    /* observability best-effort */
  }
}

async function bumpUsage(input: {
  supabase: ReturnType<typeof createServiceClient>;
  organizationId: string;
  apiKeyId: string;
  usageDate: string;
  isError?: boolean;
  is429?: boolean;
}) {
  const { data: existing } = await input.supabase
    .from("platform_api_usage_daily")
    .select("id, request_count, error_count, rate_limit_429_count")
    .eq("organization_id", input.organizationId)
    .eq("api_key_id", input.apiKeyId)
    .eq("usage_date", input.usageDate)
    .maybeSingle();

  if (existing) {
    await input.supabase
      .from("platform_api_usage_daily")
      .update({
        request_count: existing.request_count + 1,
        error_count: existing.error_count + (input.isError ? 1 : 0),
        rate_limit_429_count:
          existing.rate_limit_429_count + (input.is429 ? 1 : 0),
      })
      .eq("id", existing.id);
    return;
  }

  await input.supabase.from("platform_api_usage_daily").insert({
    organization_id: input.organizationId,
    api_key_id: input.apiKeyId,
    usage_date: input.usageDate,
    request_count: 1,
    error_count: input.isError ? 1 : 0,
    rate_limit_429_count: input.is429 ? 1 : 0,
  });
}
