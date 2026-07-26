import type { Metadata } from "next";

import { CrmSubnav } from "@/components/crm/crm-subnav";
import { DealsManager } from "@/components/crm/deals-manager";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  listAllStages,
  listDealsWithRelations,
  listLeads,
  listOrganizationMembers,
  listPipelines,
} from "@/lib/crm/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

export const metadata: Metadata = {
  title: "Deals",
};

export default async function CrmDealsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  let deals: Awaited<ReturnType<typeof listDealsWithRelations>> = [];
  let pipelines: Awaited<ReturnType<typeof listPipelines>> = [];
  let stages: Awaited<ReturnType<typeof listAllStages>> = [];
  let leads: Awaited<ReturnType<typeof listLeads>> = [];
  let members: Awaited<ReturnType<typeof listOrganizationMembers>> = [];
  let errorMessage: string | null = null;

  try {
    [deals, pipelines, stages, leads, members] = await Promise.all([
      listDealsWithRelations(context.organization.id),
      listPipelines(context.organization.id),
      listAllStages(context.organization.id),
      listLeads(context.organization.id),
      listOrganizationMembers(context.organization.id),
    ]);
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Kon deals niet laden. Controleer of migratie 000008 is uitgevoerd.",
    );
  }

  return (
    <div>
      <PageHeader
        title="Deals"
        description="Dealregistratie met bedrijf, lead, waarde en verwachte sluitdatum."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "CRM", href: "/crm" },
          { label: "Deals" },
        ]}
      />
      <CrmSubnav currentPath="/crm/deals" />
      {errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : (
        <DealsManager
          deals={deals}
          pipelines={pipelines}
          stages={stages}
          leads={leads}
          members={members}
        />
      )}
    </div>
  );
}
