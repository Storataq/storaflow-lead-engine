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
  listOrchestratorPlans,
} from "@/lib/orchestrator/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: ORCHESTRATOR_UI.plansTitle };

export default async function OrchestratorPlansPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  await bootstrapOrchestrator(
    context.organization.id,
    context.membership.user_id,
  );
  const plans = await listOrchestratorPlans(context.organization.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={ORCHESTRATOR_UI.plansTitle}
        description="Goal planner output: stappen, dependencies en parallel groups."
      />
      {plans.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            Nog geen plans.
          </CardContent>
        </Card>
      ) : (
        plans.map((p) => {
          const steps = Array.isArray(p.steps_json) ? p.steps_json : [];
          return (
            <Card key={p.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">
                  Plan v{p.version} · {p.id.slice(0, 8)}
                </CardTitle>
                <Badge>{p.status}</Badge>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  Est. ${Number(p.estimated_cost_usd).toFixed(4)} ·{" "}
                  {p.estimated_duration_ms} ms · {steps.length} steps
                </p>
                <ol className="list-decimal space-y-1 pl-5">
                  {steps.map((s, i) => {
                    const step =
                      s && typeof s === "object"
                        ? (s as {
                            title?: string;
                            agentSlug?: string;
                            parallelGroup?: number;
                          })
                        : {};
                    return (
                      <li key={i}>
                        {step.title ?? `Step ${i + 1}`}{" "}
                        <span className="text-muted-foreground">
                          ({step.agentSlug} · g{step.parallelGroup ?? 0})
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
