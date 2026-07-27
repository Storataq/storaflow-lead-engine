"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CONNECTION_STATUS_LABELS,
  HEALTH_STATUS_LABELS,
  INTEGRATION_CATEGORY_LABELS,
  SYNC_ERROR_LABELS,
  SYNC_MODE_LABELS,
  SYNC_RUN_STATUS_LABELS,
} from "@/lib/integrations/constants";
import {
  connectIntegrationAction,
  disconnectIntegrationAction,
  reconnectIntegrationAction,
  saveIntegrationConfigAction,
  startIntegrationSyncAction,
  testIntegrationConnectionAction,
} from "@/lib/integrations/actions";
import type {
  IntegrationConnectionRow,
  IntegrationManifest,
  IntegrationSyncRunRow,
} from "@/lib/integrations/types";

type Props = {
  manifest: IntegrationManifest;
  connection: IntegrationConnectionRow | null;
  syncRuns: IntegrationSyncRunRow[];
  canManage: boolean;
};

export function IntegrationDetailClient({
  manifest,
  connection,
  syncRuns,
  canManage,
}: Props) {
  const [apiKey, setApiKey] = useState("");
  const [accountLabel, setAccountLabel] = useState(
    connection?.account_label ?? "",
  );
  const [syncScheduleNote, setSyncScheduleNote] = useState("");
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ success: boolean; message: string; authorizeUrl?: string }>) {
    startTransition(async () => {
      const result = await fn();
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      if (result.authorizeUrl) {
        window.location.href = result.authorizeUrl;
        return;
      }
      toast.success(result.message);
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {INTEGRATION_CATEGORY_LABELS[manifest.category]}
            </Badge>
            <Badge variant="outline">{manifest.status}</Badge>
            <Badge variant="outline">v{manifest.version}</Badge>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {manifest.description}
          </p>
          <p className="text-xs text-muted-foreground">
            Developer: {manifest.developer} · Auth: {manifest.authType}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!connection || connection.status === "disconnected" ? (
            <Button
              disabled={!canManage || pending || manifest.status === "coming_soon"}
              onClick={() =>
                run(() =>
                  connectIntegrationAction({
                    integrationCode: manifest.code,
                    accountLabel: accountLabel || undefined,
                    apiKey:
                      manifest.authType === "api_key" ? apiKey : undefined,
                  }),
                )
              }
            >
              Connect
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                disabled={!canManage || pending}
                onClick={() =>
                  run(() =>
                    reconnectIntegrationAction({
                      connectionId: connection.id,
                    }),
                  )
                }
              >
                Re-authorize
              </Button>
              <Button
                variant="outline"
                disabled={!canManage || pending}
                onClick={() =>
                  run(() =>
                    testIntegrationConnectionAction({
                      connectionId: connection.id,
                    }),
                  )
                }
              >
                Test
              </Button>
              <Button
                disabled={
                  !canManage || pending || connection.status !== "connected"
                }
                onClick={() =>
                  run(() =>
                    startIntegrationSyncAction({
                      connectionId: connection.id,
                      mode: "manual",
                    }),
                  )
                }
              >
                Sync now
              </Button>
              <Button
                variant="ghost"
                disabled={!canManage || pending}
                onClick={() =>
                  run(() =>
                    disconnectIntegrationAction({
                      connectionId: connection.id,
                    }),
                  )
                }
              >
                Disconnect
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section
          className="space-y-3 rounded-xl border border-border p-4"
          aria-labelledby="connection-heading"
        >
          <h2 id="connection-heading" className="font-semibold">
            Connection
          </h2>
          {connection ? (
            <dl className="grid gap-2 text-sm">
              <Row
                label="Status"
                value={
                  CONNECTION_STATUS_LABELS[
                    connection.status as keyof typeof CONNECTION_STATUS_LABELS
                  ] ?? connection.status
                }
              />
              <Row
                label="Health"
                value={
                  HEALTH_STATUS_LABELS[
                    connection.health_status as keyof typeof HEALTH_STATUS_LABELS
                  ] ?? connection.health_status
                }
              />
              <Row
                label="Health detail"
                value={connection.health_message ?? "—"}
              />
              <Row
                label="Last validated"
                value={formatTs(connection.last_validated_at)}
              />
              <Row
                label="Last sync"
                value={formatTs(connection.last_synced_at)}
              />
              <Row
                label="Next sync"
                value={formatTs(connection.next_sync_at)}
              />
              <Row
                label="Account"
                value={connection.account_label ?? connection.external_account_id ?? "—"}
              />
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">
              Not connected yet. Review permissions below, then connect.
            </p>
          )}

          {manifest.authType === "api_key" && (
            <div className="space-y-2 pt-2">
              <label htmlFor="api-key" className="text-sm font-medium">
                API key
              </label>
              <Input
                id="api-key"
                type="password"
                autoComplete="off"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste API key (stored encrypted server-side)"
                disabled={!canManage}
              />
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="account-label" className="text-sm font-medium">
              Account label
            </label>
            <Input
              id="account-label"
              value={accountLabel}
              onChange={(e) => setAccountLabel(e.target.value)}
              placeholder="e.g. Sales workspace"
              disabled={!canManage}
            />
          </div>
        </section>

        <section
          className="space-y-3 rounded-xl border border-border p-4"
          aria-labelledby="details-heading"
        >
          <h2 id="details-heading" className="font-semibold">
            Integration details
          </h2>
          <div>
            <h3 className="text-sm font-medium">Permissions</h3>
            <ul className="mt-1 list-inside list-disc text-sm text-muted-foreground">
              {manifest.permissions.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-medium">Supported features</h3>
            <ul className="mt-1 flex flex-wrap gap-1">
              {manifest.features.map((f) => (
                <Badge key={f} variant="outline">
                  {f}
                </Badge>
              ))}
            </ul>
          </div>
          <div className="text-sm text-muted-foreground">
            Sync:{" "}
            {[
              manifest.supportsManualSync && "manual",
              manifest.supportsScheduledSync && "scheduled",
              manifest.supportsIncrementalSync && "incremental",
              manifest.supportsWebhooks && "webhooks",
            ]
              .filter(Boolean)
              .join(", ") || "none"}
          </div>
          <Button
            nativeButton={false}
            variant="link"
            className="h-auto px-0"
            render={<Link href={manifest.documentationUrl} />}
          >
            Documentation
          </Button>
        </section>
      </div>

      {connection && canManage ? (
        <section
          className="space-y-3 rounded-xl border border-border p-4"
          aria-labelledby="config-heading"
        >
          <h2 id="config-heading" className="font-semibold">
            Configuration
          </h2>
          <label htmlFor="sync-note" className="text-sm font-medium">
            Sync notes (saved to connection config)
          </label>
          <Input
            id="sync-note"
            value={syncScheduleNote}
            onChange={(e) => setSyncScheduleNote(e.target.value)}
            placeholder="e.g. Prefer incremental sync overnight"
          />
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              run(() =>
                saveIntegrationConfigAction({
                  connectionId: connection.id,
                  config: {
                    syncNote: syncScheduleNote,
                    preferredMode: "incremental",
                  },
                }),
              )
            }
          >
            Save configuration
          </Button>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              disabled={pending || connection.status !== "connected"}
              onClick={() =>
                run(() =>
                  startIntegrationSyncAction({
                    connectionId: connection.id,
                    mode: "incremental",
                  }),
                )
              }
            >
              Incremental sync
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending || connection.status !== "connected"}
              onClick={() =>
                run(() =>
                  startIntegrationSyncAction({
                    connectionId: connection.id,
                    mode: "full",
                  }),
                )
              }
            >
              Full sync
            </Button>
          </div>
        </section>
      ) : null}

      <section className="space-y-3" aria-labelledby="history-heading">
        <div className="flex items-center justify-between gap-2">
          <h2 id="history-heading" className="font-semibold">
            Recent sync history
          </h2>
          <Button
            nativeButton={false}
            size="sm"
            variant="outline"
            render={<Link href="/integrations/sync-history" />}
          >
            View all
          </Button>
        </div>
        {syncRuns.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No sync runs yet for this connection.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th className="px-3 py-2 font-medium">Started</th>
                  <th className="px-3 py-2 font-medium">Finished</th>
                  <th className="px-3 py-2 font-medium">Duration</th>
                  <th className="px-3 py-2 font-medium">Imported</th>
                  <th className="px-3 py-2 font-medium">Exported</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Errors</th>
                </tr>
              </thead>
              <tbody>
                {syncRuns.map((run) => (
                  <tr key={run.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">{formatTs(run.started_at ?? run.created_at)}</td>
                    <td className="px-3 py-2">{formatTs(run.finished_at)}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {run.duration_ms != null ? `${run.duration_ms} ms` : "—"}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{run.records_imported}</td>
                    <td className="px-3 py-2 tabular-nums">{run.records_exported}</td>
                    <td className="px-3 py-2">
                      <Badge variant="secondary">
                        {SYNC_RUN_STATUS_LABELS[
                          run.status as keyof typeof SYNC_RUN_STATUS_LABELS
                        ] ?? run.status}
                      </Badge>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {SYNC_MODE_LABELS[
                          run.sync_mode as keyof typeof SYNC_MODE_LABELS
                        ] ?? run.sync_mode}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {run.error_count > 0
                        ? `${run.error_count}${
                            run.error_code
                              ? ` · ${
                                  SYNC_ERROR_LABELS[
                                    run.error_code as keyof typeof SYNC_ERROR_LABELS
                                  ] ?? run.error_code
                                }`
                              : ""
                          }`
                        : run.warning_count > 0
                          ? `${run.warning_count} warnings`
                          : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function formatTs(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}
