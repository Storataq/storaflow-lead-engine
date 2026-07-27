import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SALES_UI } from "@/lib/sales-agent/constants";
import {
  bootstrapSalesAgent,
  listSalesHistory,
} from "@/lib/sales-agent/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { formatDateTime } from "@/lib/ui/format";

export const metadata: Metadata = { title: SALES_UI.historyTitle };

export default async function SalesHistoryPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  await bootstrapSalesAgent(
    context.organization.id,
    context.membership.user_id,
  );
  const events = await listSalesHistory(context.organization.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={SALES_UI.historyTitle}
        description="Analyses, briefings, emails, meetings, forecasts, bulk jobs — audit trail."
      />
      <Card>
        <CardHeader>
          <CardTitle>Audit trail</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No history yet.</p>
          ) : (
            events.map((e) => (
              <div
                key={e.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{e.summary}</p>
                  <p className="text-muted-foreground">
                    {formatDateTime(e.created_at)}
                    {e.provider ? ` · ${e.provider}/${e.model ?? "—"}` : ""}
                    {Number(e.cost_usd) > 0
                      ? ` · $${Number(e.cost_usd).toFixed(6)}`
                      : ""}
                  </p>
                </div>
                <Badge variant="outline">{e.event_type}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
