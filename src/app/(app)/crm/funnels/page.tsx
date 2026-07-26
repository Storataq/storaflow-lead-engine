import type { Metadata } from "next";

import { CrmSubnav } from "@/components/crm/crm-subnav";
import { FunnelsManager } from "@/components/crm/funnels-manager";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { listAllStages, listPipelines } from "@/lib/crm/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

export const metadata: Metadata = {
  title: "Funnels",
};

export default async function CrmFunnelsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  let pipelines: Awaited<ReturnType<typeof listPipelines>> = [];
  let stages: Awaited<ReturnType<typeof listAllStages>> = [];
  let errorMessage: string | null = null;
  try {
    pipelines = await listPipelines(context.organization.id);
    stages = await listAllStages(context.organization.id);
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Kon funnels niet laden. Voer migratie 000008 uit als tabellen ontbreken.",
    );
  }

  return (
    <div>
      <PageHeader
        title="Funnels"
        description="Configureer stages per pipeline: van Nieuw tot Gewonnen of Verloren."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "CRM", href: "/crm" },
          { label: "Funnels" },
        ]}
      />
      <CrmSubnav currentPath="/crm/funnels" />
      {errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : (
        <FunnelsManager pipelines={pipelines} stages={stages} />
      )}
    </div>
  );
}
