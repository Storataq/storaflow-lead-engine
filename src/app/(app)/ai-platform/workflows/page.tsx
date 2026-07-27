import type { Metadata } from "next";

import { CreateWorkflowForm } from "@/components/ai-platform/create-workflow-form";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AI_PLATFORM_UI } from "@/ai/constants";
import { listAiWorkflows } from "@/ai/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: AI_PLATFORM_UI.workflowsTitle };

export default async function AiWorkflowsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  const workflows = await listAiWorkflows(context.organization.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={AI_PLATFORM_UI.workflowsTitle}
        description="Multi-agent chains (Sales → Research → Marketing → Revenue → Copilot)."
      />
      <Card>
        <CardHeader>
          <CardTitle>Create workflow</CardTitle>
          <CardDescription>Define an ordered agent slug chain.</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateWorkflowForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Workflows</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {workflows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No workflows yet.</p>
          ) : (
            workflows.map((wf) => (
              <div
                key={wf.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {wf.name}{" "}
                    <span className="text-muted-foreground">({wf.slug})</span>
                  </p>
                  <p className="text-muted-foreground">{wf.description || "—"}</p>
                </div>
                <Badge variant="outline">{wf.status}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
