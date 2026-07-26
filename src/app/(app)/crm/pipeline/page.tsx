import type { Metadata } from "next";
import Link from "next/link";

import { CrmSubnav } from "@/components/crm/crm-subnav";
import { PipelineBoard } from "@/components/crm/pipeline-board";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  getDefaultPipeline,
  listAllStages,
  listLeads,
  listOrganizationMembers,
  listPipelines,
} from "@/lib/crm/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

export const metadata: Metadata = {
  title: "Pipeline",
};

export default async function CrmPipelinePage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  let errorMessage: string | null = null;
  let pipelines: Awaited<ReturnType<typeof listPipelines>> = [];
  let stages: Awaited<ReturnType<typeof listAllStages>> = [];
  let leads: Awaited<ReturnType<typeof listLeads>> = [];
  let members: Awaited<ReturnType<typeof listOrganizationMembers>> = [];
  let defaultPipelineId = "";

  try {
    [pipelines, stages, leads, members] = await Promise.all([
      listPipelines(context.organization.id),
      listAllStages(context.organization.id),
      listLeads(context.organization.id),
      listOrganizationMembers(context.organization.id),
    ]);
    const defaultPipeline = await getDefaultPipeline(context.organization.id);
    defaultPipelineId = defaultPipeline?.id ?? pipelines[0]?.id ?? "";
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Kon pipeline niet laden. Controleer of migratie 000008 is uitgevoerd.",
    );
  }

  return (
    <div>
      <PageHeader
        title="Pipeline"
        description="Kanban-bord met drag & drop. Stages komen uit je bestaande funnel-configuratie."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "CRM", href: "/crm" },
          { label: "Pipeline" },
        ]}
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/crm/funnels" />}
          >
            Stages beheren
          </Button>
        }
      />
      <CrmSubnav currentPath="/crm/pipeline" />
      {errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : (
        <PipelineBoard
          pipelines={pipelines}
          stages={stages}
          leads={leads}
          members={members}
          initialPipelineId={defaultPipelineId}
        />
      )}
    </div>
  );
}
