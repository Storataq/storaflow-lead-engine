import type { Metadata } from "next";
import Link from "next/link";

import { AutomationsManager } from "@/components/crm/automations-manager";
import { CrmSubnav } from "@/components/crm/crm-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { PageErrorState } from "@/components/layout/page-error-state";
import { Button } from "@/components/ui/button";
import { buildAutomationDashboard } from "@/lib/crm/automation/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

export const metadata: Metadata = { title: "Sales Automations" };

export default async function AutomationsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  const canManage =
    context.membership.role === "owner" || context.membership.role === "admin";

  let errorMessage: string | null = null;
  let dashboard: Awaited<ReturnType<typeof buildAutomationDashboard>> | null =
    null;

  try {
    dashboard = await buildAutomationDashboard(context.organization.id);
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Could not load automations. Apply migration 20260726000031_ai_sales_automation_engine.sql if needed.",
    );
  }

  if (errorMessage || !dashboard) {
    return (
      <div>
        <PageHeader
          title="Sales Automations"
          description="Event-driven workflows with visual builder and execution history."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "CRM", href: "/crm" },
            { label: "Automations" },
          ]}
        />
        <CrmSubnav currentPath="/crm/automations" />
        <PageErrorState
          title="Automations"
          description={errorMessage ?? "Unavailable"}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Sales Automations"
        description="Build no-code automations on CRM, scoring, and campaign events."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "CRM", href: "/crm" },
          { label: "Automations" },
        ]}
        actions={
          canManage ? (
            <Button
              nativeButton={false}
              render={<Link href="/crm/automations/new" />}
            >
              New automation
            </Button>
          ) : null
        }
      />
      <CrmSubnav currentPath="/crm/automations" />
      <AutomationsManager dashboard={dashboard} canManage={canManage} />
    </div>
  );
}
