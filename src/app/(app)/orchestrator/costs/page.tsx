import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
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
  getOrchestratorDashboard,
  listOrchestratorExecutions,
} from "@/lib/orchestrator/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: ORCHESTRATOR_UI.costsTitle };

export default async function OrchestratorCostsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  await bootstrapOrchestrator(
    context.organization.id,
    context.membership.user_id,
  );
  const [dash, executions] = await Promise.all([
    getOrchestratorDashboard(context.organization.id),
    listOrchestratorExecutions(context.organization.id, 30),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={ORCHESTRATOR_UI.costsTitle}
        description="Cost optimization: model router, caching hints, token usage."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total cost</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              ${dash.analytics.totalCostUsd.toFixed(4)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tokens</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {dash.analytics.totalTokens}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Cost limit</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              ${Number(dash.settings.cost_limit_usd).toFixed(2)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Per execution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {executions.map((e) => (
            <div
              key={e.id}
              className="flex justify-between gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <span>
                {e.id.slice(0, 8)} · {e.provider}/{e.model}
              </span>
              <span className="tabular-nums text-muted-foreground">
                ${Number(e.cost_usd).toFixed(4)} · {e.tokens_used} tok
              </span>
            </div>
          ))}
          {executions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Geen kostendata.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
