import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CrmSubnav } from "@/components/crm/crm-subnav";
import { LeadDetailClient } from "@/components/crm/lead-detail-client";
import { PageHeader } from "@/components/layout/page-header";
import {
  getLead,
  listAllStages,
  listDeals,
  listLeadActivities,
  listNotes,
  listPipelines,
  listTasks,
} from "@/lib/crm/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

type LeadDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: LeadDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Lead ${id.slice(0, 8)}` };
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { id } = await params;
  const context = await getActiveOrganization();
  if (!context) notFound();

  const orgId = context.organization.id;
  const lead = await getLead(orgId, id);
  if (!lead) notFound();

  const [pipelines, stages, tasks, notes, activities, allDeals] =
    await Promise.all([
      listPipelines(orgId),
      listAllStages(orgId),
      listTasks(orgId, id),
      listNotes(orgId, id),
      listLeadActivities(orgId, id),
      listDeals(orgId),
    ]);

  const deals = allDeals.filter((deal) => deal.lead_id === id);

  return (
    <div>
      <PageHeader
        title={lead.company_name}
        description="Lead detail met algemeen, deals, taken, notities en timeline."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "CRM", href: "/crm" },
          { label: "Leads", href: "/crm/leads" },
          { label: lead.company_name },
        ]}
      />
      <CrmSubnav currentPath="/crm/leads" />
      <LeadDetailClient
        lead={lead}
        pipelines={pipelines}
        stages={stages}
        tasks={tasks}
        notes={notes}
        activities={activities}
        deals={deals}
      />
    </div>
  );
}
