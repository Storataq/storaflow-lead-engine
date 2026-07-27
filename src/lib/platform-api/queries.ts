/**
 * Management UI queries — never return key hashes or webhook ciphertext.
 */

import { createClient } from "@/lib/supabase/server";
import { utcUsageDate } from "@/lib/platform-api/rate-limit";
import type {
  PlatformApiKeyPublic,
  PlatformWebhookPublic,
} from "@/lib/platform-api/types";

export type {
  PlatformApiKeyPublic,
  PlatformWebhookPublic,
} from "@/lib/platform-api/types";

const KEY_SELECT =
  "id, organization_id, name, key_prefix, permission_tier, scopes_json, status, expires_at, last_used_at, created_by, revoked_at, revoked_by, rate_limit_per_minute, rate_limit_per_day, metadata_json, created_at, updated_at";

const WEBHOOK_SELECT =
  "id, organization_id, name, target_url, status, event_types_json, secret_prefix, https_only, ip_allowlist_json, timestamp_tolerance_seconds, created_by, last_delivery_at, last_success_at, last_failure_at, created_at, updated_at";

export async function listPlatformApiKeys(
  organizationId: string,
): Promise<PlatformApiKeyPublic[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_api_keys")
    .select(KEY_SELECT)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) {
    if (error.message.includes("platform_api_keys")) return [];
    throw new Error(error.message);
  }
  return (data ?? []) as PlatformApiKeyPublic[];
}

export async function listKeyRotations(
  organizationId: string,
  apiKeyId: string,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_api_key_rotations")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("api_key_id", apiKeyId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) {
    if (error.message.includes("platform_api_key_rotations")) return [];
    throw new Error(error.message);
  }
  return data ?? [];
}

export async function listPlatformWebhooks(
  organizationId: string,
): Promise<PlatformWebhookPublic[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_webhooks")
    .select(WEBHOOK_SELECT)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) {
    if (error.message.includes("platform_webhooks")) return [];
    throw new Error(error.message);
  }
  return (data ?? []) as PlatformWebhookPublic[];
}

export async function listWebhookDeliveries(
  organizationId: string,
  opts?: { webhookId?: string; limit?: number },
) {
  const supabase = await createClient();
  let q = supabase
    .from("platform_webhook_deliveries")
    .select(
      "id, organization_id, webhook_id, event_type, event_id, status, attempt_count, http_status, duration_ms, payload_size_bytes, error_message, next_retry_at, created_at, delivered_at",
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 50);
  if (opts?.webhookId) q = q.eq("webhook_id", opts.webhookId);
  const { data, error } = await q;
  if (error) {
    if (error.message.includes("platform_webhook_deliveries")) return [];
    throw new Error(error.message);
  }
  return data ?? [];
}

export async function listApiRequestLogs(
  organizationId: string,
  limit = 50,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_api_request_logs")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    if (error.message.includes("platform_api_request_logs")) return [];
    throw new Error(error.message);
  }
  return data ?? [];
}

export async function listApiUsageDaily(
  organizationId: string,
  days = 14,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_api_usage_daily")
    .select("*")
    .eq("organization_id", organizationId)
    .order("usage_date", { ascending: false })
    .limit(days * 10);
  if (error) {
    if (error.message.includes("platform_api_usage_daily")) return [];
    throw new Error(error.message);
  }
  return data ?? [];
}

export async function listApiAuditEvents(
  organizationId: string,
  limit = 40,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_api_audit_events")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    if (error.message.includes("platform_api_audit_events")) return [];
    throw new Error(error.message);
  }
  return data ?? [];
}

export async function buildApiPlatformDashboard(organizationId: string) {
  const [keys, webhooks, logs, usage, deliveries, audit] = await Promise.all([
    listPlatformApiKeys(organizationId),
    listPlatformWebhooks(organizationId),
    listApiRequestLogs(organizationId, 30),
    listApiUsageDaily(organizationId, 7),
    listWebhookDeliveries(organizationId, { limit: 20 }),
    listApiAuditEvents(organizationId, 20),
  ]);

  const today = utcUsageDate();
  const todayUsage = usage.filter((u) => u.usage_date === today);
  const requestsToday = todayUsage.reduce((s, u) => s + u.request_count, 0);
  const errorsToday = todayUsage.reduce((s, u) => s + u.error_count, 0);
  const rate429Today = todayUsage.reduce(
    (s, u) => s + u.rate_limit_429_count,
    0,
  );
  const deliveriesOk = deliveries.filter((d) => d.status === "delivered").length;
  const deliveriesFail = deliveries.filter((d) => d.status === "failed").length;

  const pathCounts = new Map<string, number>();
  for (const log of logs) {
    pathCounts.set(log.path, (pathCounts.get(log.path) ?? 0) + 1);
  }
  const topEndpoints = [...pathCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([path, count]) => ({ path, count }));

  return {
    keys,
    webhooks,
    logs,
    usage,
    deliveries,
    audit,
    stats: {
      activeKeys: keys.filter((k) => k.status === "active").length,
      activeWebhooks: webhooks.filter((w) => w.status === "active").length,
      requestsToday,
      errorsToday,
      rate429Today,
      deliveriesOk,
      deliveriesFail,
      topEndpoints,
    },
  };
}
