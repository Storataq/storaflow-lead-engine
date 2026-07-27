import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  COLLABORATING_AGENTS,
  ORCHESTRATOR_UI,
} from "@/lib/orchestrator/constants";
import {
  bootstrapOrchestrator,
  listRegisteredCollaborators,
} from "@/lib/orchestrator/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: ORCHESTRATOR_UI.agentsTitle };

export default async function OrchestratorAgentsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  await bootstrapOrchestrator(
    context.organization.id,
    context.membership.user_id,
  );
  const agents = await listRegisteredCollaborators(context.organization.id);
  const collabSlugs = new Set<string>(
    COLLABORATING_AGENTS.map((a) => a.slug as string),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={ORCHESTRATOR_UI.agentsTitle}
        description="Beschikbare specialist agents voor multi-agent collaboration."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {COLLABORATING_AGENTS.map((c) => {
          const registered = agents.find((a) => a.slug === c.slug);
          return (
            <Card key={c.slug}>
              <CardHeader>
                <CardTitle className="text-base">{c.label}</CardTitle>
                <CardDescription className="font-mono text-xs">
                  {c.slug}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Badge variant={registered ? "default" : "outline"}>
                  {registered ? registered.status : "not registered"}
                </Badge>
                {registered?.version ? (
                  <Badge variant="outline">v{String(registered.version)}</Badge>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
        {agents
          .filter((a) => !collabSlugs.has(String(a.slug)))
          .map((a) => (
            <Card key={a.id}>
              <CardHeader>
                <CardTitle className="text-base">{a.name}</CardTitle>
                <CardDescription className="font-mono text-xs">
                  {a.slug}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant="outline">{a.status}</Badge>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}
