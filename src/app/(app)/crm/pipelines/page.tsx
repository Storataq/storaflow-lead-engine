import type { Metadata } from "next";

import { CrmSubnav } from "@/components/crm/crm-subnav";
import { PipelinesManager } from "@/components/crm/pipelines-manager";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { listPipelines } from "@/lib/crm/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

export const metadata: Metadata = {
  title: "Pipelines",
};

export default async function CrmPipelinesPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  let pipelines: Awaited<ReturnType<typeof listPipelines>> = [];
  let errorMessage: string | null = null;
  try {
    pipelines = await listPipelines(context.organization.id, {
      includeArchived: true,
    });
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Kon pipelines niet laden. Voer migratie 000008/00028 uit als tabellen ontbreken.",
    );
  }

  return (
    <div>
      <PageHeader
        title="Pipelines"
        description="Sales, Enterprise, Partners, Renewals, Customer Success — create, edit and archive pipelines."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "CRM", href: "/crm" },
          { label: "Pipelines" },
        ]}
      />
      <CrmSubnav currentPath="/crm/pipelines" />
      {errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : (
        <PipelinesManager pipelines={pipelines} />
      )}
    </div>
  );
}
