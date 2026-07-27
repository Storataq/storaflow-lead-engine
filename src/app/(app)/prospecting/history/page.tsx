import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PROSPECTING_UI } from "@/lib/prospecting/constants";
import { listProspectingHistory } from "@/lib/prospecting/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { formatDateTime } from "@/lib/ui/format";

export const metadata: Metadata = { title: PROSPECTING_UI.historyTitle };

export default async function ProspectingHistoryPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  const events = await listProspectingHistory(context.organization.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={PROSPECTING_UI.historyTitle}
        description="Searches, analyses, scores, recommendations, models, and costs."
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
