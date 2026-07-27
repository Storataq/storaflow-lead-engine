import type { Metadata } from "next";

import { ExecutionControlButtons } from "@/components/orchestrator/orchestrator-action-buttons";
import { WorkflowVisualizer } from "@/components/orchestrator/workflow-visualizer";
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
  listLiveExecutions,
} from "@/lib/orchestrator/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: ORCHESTRATOR_UI.liveTitle };

function asAgents(json: unknown): string[] {
  if (!Array.isArray(json)) return [];
  return json.filter((x): x is string => typeof x === "string");
}

export default async function OrchestratorLivePage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  await bootstrapOrchestrator(
    context.organization.id,
    context.membership.user_id,
  );
  const live = await listLiveExecutions(context.organization.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={ORCHESTRATOR_UI.liveTitle}
        description="Realtime actieve agents, taken, queues en voortgang."
      />
      {live.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            Geen live workflows. Start een natural-language goal vanaf Overview.
          </CardContent>
        </Card>
      ) : (
        live.map((e) => (
          <Card key={e.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">
                  <Badge className="mr-2">{e.status}</Badge>
                  {e.id.slice(0, 8)}
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {e.provider}/{e.model} · ${Number(e.cost_usd).toFixed(4)} ·{" "}
                  {e.latency_ms} ms
                </p>
              </div>
              <ExecutionControlButtons executionId={e.id} status={e.status} />
            </CardHeader>
            <CardContent>
              <WorkflowVisualizer
                agents={asAgents(e.agents_json)}
                status={e.status}
                progressPct={Number(e.progress_pct)}
              />
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
