import type { Metadata } from "next";

import { ApiManagementSubnav } from "@/components/platform-api/api-management-subnav";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import {
  listApiAuditEvents,
  listApiRequestLogs,
} from "@/lib/platform-api/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: "API Logs" };

export default async function ApiLogsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  const [logs, audit] = await Promise.all([
    listApiRequestLogs(context.organization.id, 80),
    listApiAuditEvents(context.organization.id, 40),
  ]);

  return (
    <div>
      <PageHeader
        title="API logs"
        description="Request logs and audit trail for keys, auth failures, and webhook changes."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "API Management", href: "/api-management" },
          { label: "Logs" },
        ]}
      />
      <ApiManagementSubnav currentPath="/api-management/logs" />

      <section className="mb-8 space-y-3">
        <h2 className="font-semibold">Request logs</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No requests logged yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th className="px-3 py-2 font-medium">Time</th>
                  <th className="px-3 py-2 font-medium">Method</th>
                  <th className="px-3 py-2 font-medium">Path</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Latency</th>
                  <th className="px-3 py-2 font-medium">Request ID</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">{log.method}</td>
                    <td className="px-3 py-2">
                      <code className="text-xs">{log.path}</code>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="secondary">{log.status_code}</Badge>
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {log.latency_ms != null ? `${log.latency_ms} ms` : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <code className="text-xs">{log.request_id}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Audit events</h2>
        {audit.length === 0 ? (
          <p className="text-sm text-muted-foreground">No audit events yet.</p>
        ) : (
          <ul className="space-y-2">
            {audit.map((ev) => (
              <li
                key={ev.id}
                className="rounded-lg border border-border px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{ev.event_type}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(ev.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-muted-foreground">{ev.message}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
