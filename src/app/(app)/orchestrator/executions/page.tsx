import type { Metadata } from "next";

import { ExecutionControlButtons } from "@/components/orchestrator/orchestrator-action-buttons";
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
  listOrchestratorExecutions,
} from "@/lib/orchestrator/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: ORCHESTRATOR_UI.executionsTitle };

export default async function OrchestratorExecutionsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  await bootstrapOrchestrator(
    context.organization.id,
    context.membership.user_id,
  );
  const rows = await listOrchestratorExecutions(context.organization.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={ORCHESTRATOR_UI.executionsTitle}
        description="Volledige execution history met merged reports."
      />
      {rows.map((e) => (
        <Card key={e.id}>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">
                <Badge className="mr-2">{e.status}</Badge>
                {e.id.slice(0, 8)}
              </CardTitle>
              <p className="mt-2 text-sm">{e.executive_summary || "—"}</p>
            </div>
            <ExecutionControlButtons executionId={e.id} status={e.status} />
          </CardHeader>
          {e.merged_report ? (
            <CardContent>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-xs">
                {e.merged_report}
              </pre>
            </CardContent>
          ) : null}
        </Card>
      ))}
      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            Nog geen executions.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
