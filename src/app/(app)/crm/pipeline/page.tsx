import type { Metadata } from "next";
import Link from "next/link";

import { CrmSubnav } from "@/components/crm/crm-subnav";
import { DealsPipelineBoard } from "@/components/crm/deals-pipeline-board";
import { PipelineBoard } from "@/components/crm/pipeline-board";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  getDefaultPipeline,
  listAllStages,
  listDealsWithRelations,
  listLeads,
  listOrganizationMembers,
  listPipelines,
} from "@/lib/crm/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { toUserFacingError } from "@/lib/ui/user-facing-error";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pipeline",
};

type PageProps = {
  searchParams: Promise<{ view?: string }>;
};

export default async function CrmPipelinePage({ searchParams }: PageProps) {
  const context = await getActiveOrganization();
  if (!context) return null;

  const params = await searchParams;
  const view = params.view === "deals" ? "deals" : "leads";

  let errorMessage: string | null = null;
  let pipelines: Awaited<ReturnType<typeof listPipelines>> = [];
  let stages: Awaited<ReturnType<typeof listAllStages>> = [];
  let leads: Awaited<ReturnType<typeof listLeads>> = [];
  let deals: Awaited<ReturnType<typeof listDealsWithRelations>> = [];
  let members: Awaited<ReturnType<typeof listOrganizationMembers>> = [];
  let defaultPipelineId = "";

  try {
    [pipelines, stages, leads, deals, members] = await Promise.all([
      listPipelines(context.organization.id),
      listAllStages(context.organization.id),
      listLeads(context.organization.id),
      listDealsWithRelations(context.organization.id),
      listOrganizationMembers(context.organization.id),
    ]);
    const defaultPipeline = await getDefaultPipeline(context.organization.id);
    defaultPipelineId = defaultPipeline?.id ?? pipelines[0]?.id ?? "";
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Kon pipeline niet laden. Controleer of migratie 000008/00028 is uitgevoerd.",
    );
  }

  return (
    <div>
      <PageHeader
        title="Pipeline"
        description="Kanban board for leads and deals. Stages come from your funnel configuration."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "CRM", href: "/crm" },
          { label: "Pipeline" },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/crm/funnels" />}
            >
              Stages beheren
            </Button>
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/crm/analytics" />}
            >
              Analytics
            </Button>
          </div>
        }
      />
      <CrmSubnav currentPath="/crm/pipeline" />

      <div className="mb-4 flex gap-2">
        <Link
          href="/crm/pipeline"
          className={cn(
            "rounded-lg border px-3 py-1.5 text-sm",
            view === "leads"
              ? "border-foreground/20 bg-muted font-medium"
              : "border-transparent text-muted-foreground hover:bg-muted/60",
          )}
        >
          Leads board
        </Link>
        <Link
          href="/crm/pipeline?view=deals"
          className={cn(
            "rounded-lg border px-3 py-1.5 text-sm",
            view === "deals"
              ? "border-foreground/20 bg-muted font-medium"
              : "border-transparent text-muted-foreground hover:bg-muted/60",
          )}
        >
          Deals board
        </Link>
      </div>

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : view === "deals" ? (
        <DealsPipelineBoard
          pipelines={pipelines}
          stages={stages}
          deals={deals}
          members={members}
          initialPipelineId={defaultPipelineId}
        />
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
