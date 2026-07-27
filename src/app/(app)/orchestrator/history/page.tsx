import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ORCHESTRATOR_UI } from "@/lib/orchestrator/constants";
import {
  bootstrapOrchestrator,
  listOrchestratorHistory,
} from "@/lib/orchestrator/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: ORCHESTRATOR_UI.historyTitle };

export default async function OrchestratorHistoryPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  await bootstrapOrchestrator(
    context.organization.id,
    context.membership.user_id,
  );
  const events = await listOrchestratorHistory(context.organization.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={ORCHESTRATOR_UI.historyTitle}
        description="Audit log: doelen, agent keuzes, kosten, latency, errors."
      />
      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nog geen history.</p>
          ) : (
            events.map((e) => (
              <div
                key={e.id}
                className="rounded-md border px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{e.event_type}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(e.created_at).toLocaleString("nl-NL")}
                  </span>
                  {e.cost_usd ? (
                    <span className="text-xs text-muted-foreground">
                      ${Number(e.cost_usd).toFixed(4)}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1">{e.summary}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
