import type { Metadata } from "next";

import { ApprovalButtons } from "@/components/orchestrator/orchestrator-action-buttons";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ORCHESTRATOR_UI } from "@/lib/orchestrator/constants";
import {
  bootstrapOrchestrator,
  listOrchestratorApprovals,
} from "@/lib/orchestrator/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: ORCHESTRATOR_UI.approvalsTitle };

export default async function OrchestratorApprovalsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  await bootstrapOrchestrator(
    context.organization.id,
    context.membership.user_id,
  );
  const approvals = await listOrchestratorApprovals(context.organization.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={ORCHESTRATOR_UI.approvalsTitle}
        description="Auto, manual, multi, workflow en critical approvals."
      />
      {approvals.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            Geen approvals.
          </CardContent>
        </Card>
      ) : (
        approvals.map((a) => (
          <Card key={a.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">{a.title}</CardTitle>
                <CardDescription>{a.rationale}</CardDescription>
              </div>
              <Badge>{a.status}</Badge>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Type: {a.approval_type}
              </p>
              {a.status === "pending" ? (
                <ApprovalButtons approvalId={a.id} />
              ) : null}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
