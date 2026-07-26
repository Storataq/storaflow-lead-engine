import type { Metadata } from "next";

import { CrmSubnav } from "@/components/crm/crm-subnav";
import { LeadsWorkspace } from "@/components/crm/leads-workspace";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  getDefaultPipeline,
  listAllStages,
  listLeads,
  listPipelines,
} from "@/lib/crm/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

export const metadata: Metadata = {
  title: "Leads",
};

export default async function CrmLeadsPage() {
  const context = await getActiveOrganization();

  if (!context) {
    return null;
  }

  let errorMessage: string | null = null;
  let pipelines: Awaited<ReturnType<typeof listPipelines>> = [];
  let stages: Awaited<ReturnType<typeof listAllStages>> = [];
  let leads: Awaited<ReturnType<typeof listLeads>> = [];
  let defaultPipelineId = "";

  try {
    pipelines = await listPipelines(context.organization.id);
    stages = await listAllStages(context.organization.id);
    leads = await listLeads(context.organization.id);
    const defaultPipeline = await getDefaultPipeline(context.organization.id);
    defaultPipelineId = defaultPipeline?.id ?? pipelines[0]?.id ?? "";
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Kon CRM-leads niet laden. Voer migratie 000008 uit als tabellen ontbreken.",
    );
  }

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Kanban-bord per pipeline met configureerbare funnel stages."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "CRM", href: "/crm" },
          { label: "Leads" },
        ]}
      />
      <CrmSubnav currentPath="/crm/leads" />
      {errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : (
        <LeadsWorkspace
          pipelines={pipelines}
          stages={stages}
          leads={leads}
          activePipelineId={defaultPipelineId}
        />
      )}
    </div>
  );
}
