import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PROSPECTING_UI } from "@/lib/prospecting/constants";
import { listResearchRuns } from "@/lib/prospecting/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { formatDateTime } from "@/lib/ui/format";

export const metadata: Metadata = { title: PROSPECTING_UI.researchTitle };

export default async function ProspectingResearchPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  const runs = await listResearchRuns(context.organization.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={PROSPECTING_UI.researchTitle}
        description="Website fetch → analysis → classify → opportunities → score → enrich."
      />
      <Card>
        <CardHeader>
          <CardTitle>Research runs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No research runs yet.</p>
          ) : (
            runs.map((run) => (
              <div
                key={run.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {run.stage} · {run.provider ?? "—"}/{run.model ?? "—"}
                  </p>
                  <p className="text-muted-foreground">
                    {formatDateTime(run.created_at)} · {run.latency_ms}ms · $
                    {Number(run.cost_usd).toFixed(6)}
                    {run.error_message ? ` · ${run.error_message}` : ""}
                  </p>
                </div>
                <Badge variant="outline">{run.status}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
