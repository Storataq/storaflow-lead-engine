/**
 * Reusable sync engine — queue, retry, conflict/error classification.
 */

import {
  SYNC_ERROR_CODES,
  type SyncErrorCode,
  type SyncMode,
} from "@/lib/integrations/constants";
import { getIntegrationPlugin } from "@/lib/integrations/registry";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

export function classifySyncError(message: string): SyncErrorCode {
  const m = message.toLowerCase();
  if (m.includes("expired") || m.includes("invalid_grant")) return "expired_token";
  if (m.includes("permission") || m.includes("scope") || m.includes("forbidden")) {
    return "missing_permissions";
  }
  if (m.includes("rate") || m.includes("429")) return "rate_limited";
  if (m.includes("timeout") || m.includes("timed out")) return "timeout";
  if (m.includes("credential") || m.includes("unauthorized") || m.includes("401")) {
    return "invalid_credentials";
  }
  if (m.includes("network") || m.includes("econn") || m.includes("connection")) {
    return "connection_lost";
  }
  if (m.includes("conflict")) return "conflict";
  if (SYNC_ERROR_CODES.includes(m as SyncErrorCode)) return m as SyncErrorCode;
  return m.includes("api") ? "api_error" : "unknown";
}

export async function enqueueSyncRun(input: {
  organizationId: string;
  connectionId: string;
  mode: SyncMode;
  direction?: "import" | "export" | "bidirectional";
  createdBy?: string | null;
}): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("integration_sync_runs")
    .insert({
      organization_id: input.organizationId,
      connection_id: input.connectionId,
      sync_mode: input.mode,
      direction: input.direction ?? "import",
      status: "queued",
      created_by: input.createdBy ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function processSyncRun(input: {
  organizationId: string;
  syncRunId: string;
  integrationCode: string;
}): Promise<{
  status: "completed" | "failed" | "partial";
  imported: number;
  exported: number;
  errorCode?: string;
  errorMessage?: string;
}> {
  const supabase = await createClient();
  const started = Date.now();

  const { data: run, error: runErr } = await supabase
    .from("integration_sync_runs")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("id", input.syncRunId)
    .maybeSingle();
  if (runErr) throw new Error(runErr.message);
  if (!run) throw new Error("Sync run not found.");

  await supabase
    .from("integration_sync_runs")
    .update({
      status: "running",
      started_at: new Date().toISOString(),
    })
    .eq("id", run.id)
    .eq("organization_id", input.organizationId);

  const plugin = getIntegrationPlugin(input.integrationCode);
  const adapter = plugin?.sync;

  try {
    if (!adapter) {
      throw new Error("Sync adapter unavailable for this integration.");
    }
    const result = await adapter.run({
      organizationId: input.organizationId,
      connectionId: run.connection_id,
      mode: run.sync_mode as SyncMode,
      cursor: (run.cursor_json ?? {}) as Record<string, unknown>,
    });

    const status =
      result.errorMessage
        ? "partial"
        : result.warnings.length
          ? "partial"
          : "completed";

    for (const warning of result.warnings) {
      await supabase.from("integration_sync_events").insert({
        organization_id: input.organizationId,
        sync_run_id: run.id,
        level: "warning",
        code: "adapter_warning",
        message: warning,
      });
    }

    await supabase
      .from("integration_sync_runs")
      .update({
        status,
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - started,
        records_imported: result.imported,
        records_exported: result.exported,
        warning_count: result.warnings.length,
        error_count: result.errorMessage ? 1 : 0,
        error_code: result.errorCode ?? null,
        error_message: result.errorMessage ?? null,
        cursor_json: (result.cursor ?? {}) as Json,
        stats_json: {
          warnings: result.warnings,
        } as Json,
      })
      .eq("id", run.id)
      .eq("organization_id", input.organizationId);

    await supabase
      .from("integration_connections")
      .update({
        last_synced_at: new Date().toISOString(),
        health_status: result.errorMessage ? "degraded" : "healthy",
        health_message: result.errorMessage ?? "Last sync completed",
        sync_stats_json: {
          lastImported: result.imported,
          lastExported: result.exported,
        } as Json,
      })
      .eq("id", run.connection_id)
      .eq("organization_id", input.organizationId);

    return {
      status,
      imported: result.imported,
      exported: result.exported,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Sync failed unexpectedly.";
    const errorCode = classifySyncError(message);

    await supabase.from("integration_sync_events").insert({
      organization_id: input.organizationId,
      sync_run_id: run.id,
      level: "error",
      code: errorCode,
      message,
    });

    await supabase
      .from("integration_sync_runs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - started,
        error_count: 1,
        error_code: errorCode,
        error_message: message,
        retry_count: (run.retry_count ?? 0) + 1,
      })
      .eq("id", run.id)
      .eq("organization_id", input.organizationId);

    const connectionPatch: {
      health_status: string;
      health_message: string;
      status?: string;
    } = {
      health_status: "unhealthy",
      health_message: message,
    };
    if (errorCode === "expired_token" || errorCode === "invalid_credentials") {
      connectionPatch.status = "needs_reauth";
    }

    await supabase
      .from("integration_connections")
      .update(connectionPatch)
      .eq("id", run.connection_id)
      .eq("organization_id", input.organizationId);

    return {
      status: "failed",
      imported: 0,
      exported: 0,
      errorCode,
      errorMessage: message,
    };
  }
}
