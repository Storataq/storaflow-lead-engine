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
  listFailedExecutions,
} from "@/lib/orchestrator/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: ORCHESTRATOR_UI.failuresTitle };

export default async function OrchestratorFailuresPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  await bootstrapOrchestrator(
    context.organization.id,
    context.membership.user_id,
  );
  const rows = await listFailedExecutions(context.organization.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={ORCHESTRATOR_UI.failuresTitle}
        description="Retry, fallback model/provider, alternate agent, partial recovery."
      />
      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            Geen failures.
          </CardContent>
        </Card>
      ) : (
        rows.map((e) => (
          <Card key={e.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">
                  <Badge variant="destructive" className="mr-2">
                    {e.status}
                  </Badge>
                  {e.error_message || "Partial / cancelled"}
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {e.executive_summary}
                </p>
              </div>
              <ExecutionControlButtons executionId={e.id} status={e.status} />
            </CardHeader>
          </Card>
        ))
      )}
    </div>
  );
}
