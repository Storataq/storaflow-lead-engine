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
  listOrchestratorTasks,
} from "@/lib/orchestrator/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: ORCHESTRATOR_UI.tasksTitle };

export default async function OrchestratorTasksPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  await bootstrapOrchestrator(
    context.organization.id,
    context.membership.user_id,
  );
  const tasks = await listOrchestratorTasks(context.organization.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={ORCHESTRATOR_UI.tasksTitle}
        description="Status, dependencies, retries, timeouts en prioriteiten."
      />
      <Card>
        <CardHeader>
          <CardTitle>Task queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Geen tasks.</p>
          ) : (
            tasks.map((t) => (
              <div
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <div>
                  <Badge variant="outline" className="mr-2">
                    {t.status}
                  </Badge>
                  <span className="font-medium">{t.title}</span>
                  <p className="text-xs text-muted-foreground">
                    {t.agent_slug} · attempt {t.attempt}/{t.max_attempts} ·
                    timeout {t.timeout_seconds}s
                  </p>
                </div>
                <span className="tabular-nums text-muted-foreground">
                  {t.latency_ms} ms · ${Number(t.cost_usd).toFixed(4)}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
