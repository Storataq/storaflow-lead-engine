import type { Metadata } from "next";

import { CrmSubnav } from "@/components/crm/crm-subnav";
import { ExecutiveCrmDashboard } from "@/components/crm/executive-crm-dashboard";
import { PageHeader } from "@/components/layout/page-header";
import { ReloadErrorAlert } from "@/components/layout/reload-error-alert";
import {
  listDeals,
  listLeads,
  listOrganizationMembers,
  listTasks,
} from "@/lib/crm/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

export const metadata: Metadata = {
  title: "Executive Dashboard",
};

export default async function ExecutiveCrmDashboardPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  let errorMessage: string | null = null;
  let leads: Awaited<ReturnType<typeof listLeads>> = [];
  let deals: Awaited<ReturnType<typeof listDeals>> = [];
  let tasks: Awaited<ReturnType<typeof listTasks>> = [];
  let members: Awaited<ReturnType<typeof listOrganizationMembers>> = [];

  try {
    const orgId = context.organization.id;
    [leads, deals, tasks, members] = await Promise.all([
      listLeads(orgId),
      listDeals(orgId),
      listTasks(orgId),
      listOrganizationMembers(orgId),
    ]);
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Kon Executive Dashboard niet laden.",
    );
  }

  return (
    <div>
      <PageHeader
        title="Executive Dashboard"
        description="Sales, funnel, pipeline en commercial performance — aggregation over bestaande CRM-modules."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "CRM", href: "/crm" },
          { label: "Executive Dashboard" },
        ]}
      />
      <CrmSubnav currentPath="/crm/executive" />
      {errorMessage ? (
        <ReloadErrorAlert
          title="Executive Dashboard niet beschikbaar"
          description={errorMessage}
        />
      ) : (
        <ExecutiveCrmDashboard
          leads={leads}
          deals={deals}
          tasks={tasks}
          members={members}
        />
      )}
    </div>
  );
}
