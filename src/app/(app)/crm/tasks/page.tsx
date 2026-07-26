import type { Metadata } from "next";

import { CrmSubnav } from "@/components/crm/crm-subnav";
import { TasksManager } from "@/components/crm/tasks-manager";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { listDeals, listLeads, listTasks } from "@/lib/crm/queries";
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
  let errorMessage: string | null = null;
  try {
    [tasks, leads, deals] = await Promise.all([
      listTasks(context.organization.id),
      listLeads(context.organization.id),
      listDeals(context.organization.id),
    ]);
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Kon taken niet laden. Controleer of migratie 000008 is uitgevoerd.",
    );
  }

  return (
    <div>
      <PageHeader
        title="Taken"
        description="Taken met statusfilters, prioriteit en koppeling aan leads of deals."
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
        <TasksManager tasks={tasks} leads={leads} deals={deals} />
      )}
    </div>
  );
}
