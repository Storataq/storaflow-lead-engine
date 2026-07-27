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
} from "@/lib/orchestrator/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: ORCHESTRATOR_UI.performanceTitle };

export default async function OrchestratorPerformancePage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  await bootstrapOrchestrator(
    context.organization.id,
    context.membership.user_id,
  );
  const dash = await getOrchestratorDashboard(context.organization.id);
  const a = dash.analytics;

  return (
    <div className="space-y-6">
      <PageHeader
        title={ORCHESTRATOR_UI.performanceTitle}
        description="Orchestration analytics: duur, succes, agent prestaties."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Workflows", value: String(a.workflowCount) },
          { label: "Success rate", value: `${Math.round(a.successRate * 100)}%` },
          { label: "Avg duration", value: `${a.avgDurationMs} ms` },
          { label: "Efficiency", value: a.runningCount ? "Active" : "Idle" },
        ].map((m) => (
          <Card key={m.label}>
            <CardHeader className="pb-2">
              <CardDescription>{m.label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{m.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Agent performance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {a.agentPerformance.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nog geen agent runs.</p>
          ) : (
            a.agentPerformance.map((p) => (
              <div
                key={p.agentSlug}
                className="flex flex-wrap justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <span className="font-mono text-xs">{p.agentSlug}</span>
                <span className="text-muted-foreground">
                  {p.runs} runs · {Math.round(p.successRate * 100)}% · avg{" "}
                  {p.avgLatencyMs} ms · ${p.costUsd.toFixed(4)}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
