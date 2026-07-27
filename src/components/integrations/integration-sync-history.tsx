"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  SYNC_ERROR_LABELS,
  SYNC_MODE_LABELS,
  SYNC_RUN_STATUS_LABELS,
} from "@/lib/integrations/constants";
import type { IntegrationSyncRunRow } from "@/lib/integrations/types";

type Props = {
  runs: IntegrationSyncRunRow[];
  connectionLabels: Record<string, string>;
};

export function IntegrationSyncHistory({ runs, connectionLabels }: Props) {
  if (runs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No synchronization history yet. Connect an integration and run a sync.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[800px] text-left text-sm">
        <thead className="border-b border-border bg-muted/40">
          <tr>
            <th className="px-3 py-2 font-medium">Integration</th>
            <th className="px-3 py-2 font-medium">Started</th>
            <th className="px-3 py-2 font-medium">Finished</th>
            <th className="px-3 py-2 font-medium">Duration</th>
            <th className="px-3 py-2 font-medium">Imported</th>
            <th className="px-3 py-2 font-medium">Exported</th>
            <th className="px-3 py-2 font-medium">Warnings</th>
            <th className="px-3 py-2 font-medium">Errors</th>
            <th className="px-3 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id} className="border-b border-border last:border-0">
              <td className="px-3 py-2">
                <Link
                  href={`/integrations/${encodeURIComponent(
                    connectionLabels[run.connection_id]?.split("::")[0] ?? "",
                  )}`}
                  className="hover:underline"
                >
                  {connectionLabels[run.connection_id]?.split("::")[1] ??
                    "Integration"}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {SYNC_MODE_LABELS[
                    run.sync_mode as keyof typeof SYNC_MODE_LABELS
                  ] ?? run.sync_mode}
                </p>
              </td>
              <td className="px-3 py-2">
                {formatTs(run.started_at ?? run.created_at)}
              </td>
              <td className="px-3 py-2">{formatTs(run.finished_at)}</td>
              <td className="px-3 py-2 tabular-nums">
                {run.duration_ms != null ? `${run.duration_ms} ms` : "—"}
              </td>
              <td className="px-3 py-2 tabular-nums">{run.records_imported}</td>
              <td className="px-3 py-2 tabular-nums">{run.records_exported}</td>
              <td className="px-3 py-2 tabular-nums">{run.warning_count}</td>
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
                  : "—"}
              </td>
              <td className="px-3 py-2">
                <Badge variant="secondary">
                  {SYNC_RUN_STATUS_LABELS[
                    run.status as keyof typeof SYNC_RUN_STATUS_LABELS
                  ] ?? run.status}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
