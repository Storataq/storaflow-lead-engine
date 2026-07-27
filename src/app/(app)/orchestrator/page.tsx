import type { Metadata } from "next";

import {
  OrchestratorBulkGoalsButton,
  OrchestratorGoalForm,
} from "@/components/orchestrator/orchestrator-action-buttons";
import { WorkflowVisualizer } from "@/components/orchestrator/workflow-visualizer";
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
  getOrchestratorDashboard,
} from "@/lib/orchestrator/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: ORCHESTRATOR_UI.overviewTitle };

function asAgents(json: unknown): string[] {
  if (!Array.isArray(json)) return [];
  return json.filter((x): x is string => typeof x === "string");
}

export default async function OrchestratorOverviewPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  await bootstrapOrchestrator(
    context.organization.id,
    context.membership.user_id,
  );
  const dash = await getOrchestratorDashboard(context.organization.id);
  const a = dash.analytics;

  const metrics = [
    { label: "Workflows", value: String(a.workflowCount) },
    { label: "Running", value: String(a.runningCount) },
    { label: "Success rate", value: `${Math.round(a.successRate * 100)}%` },
    { label: "Avg duration", value: `${a.avgDurationMs} ms` },
    { label: "Total cost", value: `$${a.totalCostUsd.toFixed(4)}` },
    { label: "Failures", value: String(a.failureCount) },
    { label: "Approvals", value: String(dash.pendingApprovals) },
    { label: "Tokens", value: String(a.totalTokens) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={ORCHESTRATOR_UI.hubTitle}
        description="Centraal brein: plant doelen, selecteert agents, runt parallel en merge resultaten."
        actions={<OrchestratorBulkGoalsButton />}
      />

      <Card>
        <CardHeader>
          <CardTitle>Natural language goal</CardTitle>
          <CardDescription>
            AI bepaalt automatisch welke agents nodig zijn.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrchestratorGoalForm />
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardHeader className="pb-2">
              <CardDescription>{m.label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{m.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>AI recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dash.recommendations.map((r) => (
              <div key={r} className="rounded-md border px-3 py-2 text-sm">
                {r}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Live workflows</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dash.running.length === 0 ? (
              <p className="text-sm text-muted-foreground">Geen actieve workflows.</p>
            ) : (
              dash.running.slice(0, 4).map((e) => (
                <div key={e.id} className="space-y-2 rounded-md border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge>{e.status}</Badge>
                    <span className="text-xs text-muted-foreground">
                      ${Number(e.cost_usd).toFixed(4)}
                    </span>
                  </div>
                  <WorkflowVisualizer
                    agents={asAgents(e.agents_json)}
                    status={e.status}
                    progressPct={Number(e.progress_pct)}
                  />
                  {e.executive_summary ? (
                    <p className="text-sm text-muted-foreground">
                      {e.executive_summary}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent workflows</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {dash.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nog geen executions.</p>
          ) : (
            dash.recent.map((e) => (
              <div
                key={e.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <div>
                  <Badge variant="outline">{e.status}</Badge>
                  <span className="ml-2 text-muted-foreground">
                    {e.executive_summary || e.id.slice(0, 8)}
                  </span>
                </div>
                <span className="tabular-nums text-muted-foreground">
                  {e.latency_ms} ms · ${Number(e.cost_usd).toFixed(4)}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
