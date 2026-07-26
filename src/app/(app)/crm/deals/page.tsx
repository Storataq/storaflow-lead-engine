import type { Metadata } from "next";

import { CrmSubnav } from "@/components/crm/crm-subnav";
import { DealsManager } from "@/components/crm/deals-manager";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  listAllStages,
  listDeals,
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

  let deals: Awaited<ReturnType<typeof listDeals>> = [];
  let pipelines: Awaited<ReturnType<typeof listPipelines>> = [];
  let stages: Awaited<ReturnType<typeof listAllStages>> = [];
  let errorMessage: string | null = null;

  try {
    [deals, pipelines, stages] = await Promise.all([
      listDeals(context.organization.id),
      listPipelines(context.organization.id),
      listAllStages(context.organization.id),
    ]);
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Kon deals niet laden. Voer migratie 000008 uit als tabellen ontbreken.",
    );
  }

  return (
    <div>
      <PageHeader
        title="Deals"
        description="Dealregistratie gekoppeld aan pipelines en stages."
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
        <DealsManager deals={deals} pipelines={pipelines} stages={stages} />
      )}
    </div>
  );
}
