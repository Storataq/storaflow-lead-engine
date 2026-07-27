import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AI_PLATFORM_UI } from "@/ai/constants";
import { listAiLogs } from "@/ai/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { formatDateTime } from "@/lib/ui/format";

export const metadata: Metadata = { title: AI_PLATFORM_UI.logsTitle };

export default async function AiLogsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  const logs = await listAiLogs(context.organization.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={AI_PLATFORM_UI.logsTitle}
        description="Execution history: input/output previews, tokens, latency, cost, tools, errors."
      />
      <Card>
        <CardHeader>
          <CardTitle>Execution logs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No logs yet.</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="space-y-1 rounded-md border p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    {log.provider ?? "—"}/{log.model ?? "—"}
                  </Badge>
                  <span className="text-muted-foreground">
                    {formatDateTime(log.created_at)} · {log.latency_ms}ms · $
                    {Number(log.cost_usd).toFixed(6)}
                  </span>
                  {log.tool_name ? (
                    <Badge variant="secondary">{log.tool_name}</Badge>
                  ) : null}
                </div>
                <p className="text-muted-foreground">
                  in: {log.input_preview.slice(0, 160) || "—"}
                </p>
                <p>
                  out:{" "}
                  {log.error_message
                    ? `ERROR: ${log.error_message}`
                    : log.output_preview.slice(0, 240) || "—"}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
