/**
 * Integration marketplace queries — never select credential ciphertext for clients.
 */

import { createClient } from "@/lib/supabase/server";
import {
  listIntegrationCatalog,
  getIntegrationManifest,
} from "@/lib/integrations/catalog";
import type {
  IntegrationConnectionRow,
  IntegrationSyncRunRow,
} from "@/lib/integrations/types";

export type {
  IntegrationConnectionRow,
  IntegrationSyncRunRow,
} from "@/lib/integrations/types";

export async function listIntegrationConnections(
  organizationId: string,
): Promise<IntegrationConnectionRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("integration_connections")
    .select(
      "id, organization_id, integration_code, display_name, status, auth_type, account_label, external_account_id, scopes_json, config_json, health_status, health_message, last_validated_at, last_synced_at, next_sync_at, sync_stats_json, installed_by, installed_at, disconnected_at, created_at, updated_at",
    )
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false });
  if (error) {
    if (error.message.includes("integration_connections")) return [];
    throw new Error(error.message);
  }
  return data ?? [];
}

export async function getIntegrationConnection(
  organizationId: string,
  connectionId: string,
): Promise<IntegrationConnectionRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("integration_connections")
    .select(
      "id, organization_id, integration_code, display_name, status, auth_type, account_label, external_account_id, scopes_json, config_json, health_status, health_message, last_validated_at, last_synced_at, next_sync_at, sync_stats_json, installed_by, installed_at, disconnected_at, created_at, updated_at",
    )
    .eq("organization_id", organizationId)
    .eq("id", connectionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function listSyncRuns(
  organizationId: string,
  opts?: { connectionId?: string; limit?: number },
): Promise<IntegrationSyncRunRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from("integration_sync_runs")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 50);
  if (opts?.connectionId) q = q.eq("connection_id", opts.connectionId);
  const { data, error } = await q;
  if (error) {
    if (error.message.includes("integration_sync_runs")) return [];
    throw new Error(error.message);
  }
  return data ?? [];
}

export async function buildMarketplaceDashboard(organizationId: string) {
  const connections = await listIntegrationConnections(organizationId);
  const installedCodes = connections
    .filter((c) => c.status === "connected" || c.status === "needs_reauth")
    .map((c) => c.integration_code);
  const syncRuns = await listSyncRuns(organizationId, { limit: 12 });
  const catalog = listIntegrationCatalog({ sort: "popular" });
  const featured = catalog.filter((i) => i.featured);

  return {
    catalog,
    featured,
    connections,
    installedCodes,
    syncRuns,
    stats: {
      available: catalog.filter((c) => c.status !== "coming_soon").length,
      connected: connections.filter((c) => c.status === "connected").length,
      needsReauth: connections.filter((c) => c.status === "needs_reauth")
        .length,
      syncFailedToday: syncRuns.filter((r) => {
        if (r.status !== "failed") return false;
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        return r.created_at >= start.toISOString();
      }).length,
    },
  };
}

export function getPublicIntegrationDetail(code: string) {
  return getIntegrationManifest(code);
}
