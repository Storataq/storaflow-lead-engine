import type { Metadata } from "next";

import { CommentsPanel } from "@/components/collaboration/comments-panel";
import { TaskCollaborationPanel } from "@/components/collaboration/task-collaboration-panel";
import { CrmSubnav } from "@/components/crm/crm-subnav";
import { TasksManager } from "@/components/crm/tasks-manager";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { listCommentsForEntity } from "@/lib/collaboration/queries";
import { hasCollabPermission } from "@/lib/collaboration/permissions";
import {
  listDeals,
  listLeads,
  listOrganizationMembers,
  listTasks,
} from "@/lib/crm/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

export const metadata: Metadata = {
  title: "Taken",
};

export default async function CrmTasksPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  let tasks: Awaited<ReturnType<typeof listTasks>> = [];
  let leads: Awaited<ReturnType<typeof listLeads>> = [];
  let deals: Awaited<ReturnType<typeof listDeals>> = [];
  let members: Awaited<ReturnType<typeof listOrganizationMembers>> = [];
  let errorMessage: string | null = null;
  try {
    [tasks, leads, deals, members] = await Promise.all([
      listTasks(context.organization.id),
      listLeads(context.organization.id),
      listDeals(context.organization.id),
      listOrganizationMembers(context.organization.id),
    ]);
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Kon taken niet laden. Controleer of migratie 000008 is uitgevoerd.",
    );
  }

  const focusTask = tasks[0] ?? null;
  const comments = focusTask
    ? await listCommentsForEntity(
        context.organization.id,
        "task",
        focusTask.id,
      )
    : [];

  return (
    <div>
      <PageHeader
        title="Taken"
        description="Taken met statusfilters, prioriteit, watchers, checklists, subtasks en comments."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "CRM", href: "/crm" },
          { label: "Taken" },
        ]}
      />
      <CrmSubnav currentPath="/crm/tasks" />
      {errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : (
        <>
          <TasksManager tasks={tasks} leads={leads} deals={deals} />
          {focusTask ? (
            <div className="mt-8 max-w-3xl space-y-6">
              <p className="text-sm text-muted-foreground">
                Collaboration for task:{" "}
                <span className="font-medium text-foreground">
                  {focusTask.title}
                </span>
              </p>
              <TaskCollaborationPanel
                taskId={focusTask.id}
                members={members.map((m) => ({
                  userId: m.userId,
                  label: m.label,
                }))}
              />
              <CommentsPanel
                entityType="task"
                entityId={focusTask.id}
                comments={comments}
                canComment={hasCollabPermission(
                  context.membership.role,
                  "comment",
                )}
                currentUserId={context.membership.user_id}
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
