import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CrmSubnav } from "@/components/crm/crm-subnav";
import { LeadFunnelReadinessCard } from "@/components/crm/lead-funnel-readiness-card";
import { LeadWorkspace } from "@/components/crm/lead-workspace";
import { PageHeader } from "@/components/layout/page-header";
import { getCampaignReadinessForLead } from "@/lib/crm/funnel-activation/queries";
import { buildOpportunityRecord } from "@/lib/crm/opportunity-insights";
import { qualifyLead } from "@/lib/crm/qualification";
import {
  getLead,
  getLeadCompanyEnrichment,
  listAllStages,
  listDeals,
  listLeadActivities,
  listLeadContacts,
  listNotes,
  listOrganizationMembers,
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
  const context = await getActiveOrganization();
  if (!context) return { title: "Lead" };
  const lead = await getLead(context.organization.id, id);
  return { title: lead ? lead.company_name : `Lead ${id.slice(0, 8)}` };
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { id } = await params;
  const context = await getActiveOrganization();
  if (!context) notFound();

  const orgId = context.organization.id;
  const lead = await getLead(orgId, id);
  if (!lead) notFound();

  const [
    pipelines,
    stages,
    tasks,
    notes,
    activities,
    allDeals,
    contacts,
    enrichment,
    members,
  ] = await Promise.all([
    listPipelines(orgId),
    listAllStages(orgId),
    listTasks(orgId, id),
    listNotes(orgId, id),
    listLeadActivities(orgId, id),
    listDeals(orgId),
    listLeadContacts(orgId, id),
    getLeadCompanyEnrichment(orgId, lead.company_id),
    listOrganizationMembers(orgId),
  ]);

  const deals = allDeals.filter((deal) => deal.lead_id === id);

  const readinessRow = await getCampaignReadinessForLead(orgId, id).catch(
    () => null,
  );
  const qualification = qualifyLead(lead);
  const opportunity = buildOpportunityRecord(lead, qualification);

  const readiness = readinessRow
    ? {
        status: readinessRow.status,
        approvalStatus: readinessRow.approval_status,
        salesPriority: readinessRow.sales_priority,
        preferredEmail: readinessRow.preferred_email,
        preferredName: readinessRow.preferred_name,
        qualificationScore: readinessRow.qualification_score,
        opportunityScore: readinessRow.opportunity_score,
        reasons: readinessRow.reasons ?? [],
        missingRequirements: readinessRow.missing_requirements ?? [],
      }
    : null;

  return (
    <div>
      <PageHeader
        title={lead.company_name}
        description="Lead workspace met funnel readiness, intelligence, timeline, notes, tasks en deals."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "CRM", href: "/crm" },
          { label: "Leads", href: "/crm/leads" },
          { label: lead.company_name },
        ]}
      />
      <CrmSubnav currentPath="/crm/leads" />
      <div className="mb-4">
        <LeadFunnelReadinessCard
          leadId={lead.id}
          readiness={readiness}
          nextBestAction={opportunity.nextBestActions.primary.title}
        />
      </div>
      <LeadWorkspace
        lead={lead}
        enrichment={enrichment}
        pipelines={pipelines}
        stages={stages}
        tasks={tasks}
        notes={notes}
        activities={activities}
        deals={deals}
        contacts={contacts}
        members={members}
      />
    </div>
  );
}
