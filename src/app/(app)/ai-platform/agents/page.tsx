import type { Metadata } from "next";

import { RegisterAgentForm } from "@/components/ai-platform/register-agent-form";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AGENT_STATUS_LABELS, AI_PLATFORM_UI, type AgentLifecycleStatus } from "@/ai/constants";
import { bootstrapAiPlatform, listAiAgents } from "@/ai/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: AI_PLATFORM_UI.agentsTitle };

export default async function AiAgentsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  await bootstrapAiPlatform(context.organization.id, context.membership.user_id);
  const agents = await listAiAgents(context.organization.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={AI_PLATFORM_UI.agentsTitle}
        description="Central agent registry — register new agents without changing the kernel."
      />
      <Card>
        <CardHeader>
          <CardTitle>Register agent</CardTitle>
          <CardDescription>Slug must be unique per organization.</CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterAgentForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Registered agents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {agents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No agents.</p>
          ) : (
            agents.map((agent) => (
              <div
                key={agent.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {agent.name}{" "}
                    <span className="text-muted-foreground">({agent.slug})</span>
                  </p>
                  <p className="text-muted-foreground">
                    v{agent.version} · {agent.provider}/{agent.model} ·{" "}
                    {agent.approval_mode}
                    {agent.is_system ? " · system" : ""}
                  </p>
                </div>
                <Badge variant="outline">
                  {AGENT_STATUS_LABELS[agent.status as AgentLifecycleStatus] ??
                    agent.status}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
