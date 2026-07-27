import type { Metadata } from "next";
import Link from "next/link";

import { AutomationEditor } from "@/components/crm/automation-editor";
import { CrmSubnav } from "@/components/crm/crm-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: "New Automation" };

export default async function NewAutomationPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  const canManage =
    context.membership.role === "owner" || context.membership.role === "admin";

  return (
    <div>
      <PageHeader
        title="New automation"
        description="Pick a trigger, then design the workflow visually."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "CRM", href: "/crm" },
          { label: "Automations", href: "/crm/automations" },
          { label: "New" },
        ]}
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/crm/automations" />}
          >
            Back
          </Button>
        }
      />
      <CrmSubnav currentPath="/crm/automations" />
      <AutomationEditor canManage={canManage} />
    </div>
  );
}
