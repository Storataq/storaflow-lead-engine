import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AI_PLATFORM_UI } from "@/ai/constants";
import { listAiTasks } from "@/ai/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { formatDateTime } from "@/lib/ui/format";

export const metadata: Metadata = { title: AI_PLATFORM_UI.tasksTitle };

export default async function AiTasksPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  const tasks = await listAiTasks(context.organization.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={AI_PLATFORM_UI.tasksTitle}
        description="Priority / retry / dead-letter queues with dependencies and timeouts."
      />
      <Card>
        <CardHeader>
          <CardTitle>Task queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks yet.</p>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{task.title}</p>
                  <p className="text-muted-foreground">
                    {task.queue_name} · priority {task.priority} · attempt{" "}
                    {task.attempt}/{task.max_attempts} ·{" "}
                    {formatDateTime(task.created_at)}
                    {task.tool_name ? ` · ${task.tool_name}` : ""}
                  </p>
                </div>
                <Badge variant="outline">{task.status}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
