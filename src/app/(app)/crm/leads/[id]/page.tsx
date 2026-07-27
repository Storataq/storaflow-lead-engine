import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CrmSubnav } from "@/components/crm/crm-subnav";
import { LeadFunnelReadinessCard } from "@/components/crm/lead-funnel-readiness-card";
import { LeadWorkspace } from "@/components/crm/lead-workspace";
import { PageHeader } from "@/components/layout/page-header";
import { ReloadErrorAlert } from "@/components/layout/reload-error-alert";
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
import { toUserFacingError } from "@/lib/ui/user-facing-error";

type LeadDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: LeadDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const context = await getActiveOrganization();
    if (!context) return { title: "Lead" };
    const lead = await getLead(context.organization.id, id);
    return { title: lead ? lead.company_name : `Lead ${id.slice(0, 8)}` };
  } catch {
    return { title: "Lead" };
  }
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { id } = await params;
  const context = await getActiveOrganization();
  if (!context) notFound();

  const orgId = context.organization.id;

  let lead: Awaited<ReturnType<typeof getLead>> = null;
  try {
    lead = await getLead(orgId, id);
  } catch (error) {
    return (
      <div>
        <PageHeader
          title="Lead"
          description="Lead overview."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "CRM", href: "/crm" },
            { label: "Leads", href: "/crm/leads" },
            { label: id.slice(0, 8) },
          ]}
        />
        <CrmSubnav currentPath="/crm/leads" />
        <ReloadErrorAlert
          description={toUserFacingError(
            error,
            "Kon lead niet laden. Controleer of de CRM-migratie is uitgevoerd.",
          )}
        />
      </div>
    );
  }

  if (!lead) notFound();

  let errorMessage: string | null = null;
  let pipelines: Awaited<ReturnType<typeof listPipelines>> = [];
  let stages: Awaited<ReturnType<typeof listAllStages>> = [];
  let tasks: Awaited<ReturnType<typeof listTasks>> = [];
  let notes: Awaited<ReturnType<typeof listNotes>> = [];
  let activities: Awaited<ReturnType<typeof listLeadActivities>> = [];
  let deals: Awaited<ReturnType<typeof listDeals>> = [];
  let contacts: Awaited<ReturnType<typeof listLeadContacts>> = [];
  let enrichment: Awaited<ReturnType<typeof getLeadCompanyEnrichment>> = {
    companyName: null,
    website: null,
    phone: null,
    industry: null,
    category: null,
    country: null,
    region: null,
    city: null,
    postalCode: null,
    address: null,
    linkedinUrl: null,
    facebookUrl: null,
    instagramUrl: null,
    twitterUrl: null,
    companySize: null,
    description: null,
  };
  let members: Awaited<ReturnType<typeof listOrganizationMembers>> = [];
  let readiness: {
    status: string;
    approvalStatus: string;
    salesPriority: string;
    preferredEmail: string | null;
    preferredName: string | null;
    qualificationScore: number;
    opportunityScore: number;
    reasons: string[];
    missingRequirements: string[];
  } | null = null;
  let nextBestAction = "Review lead";

  try {
    const [
      pipelinesResult,
      stagesResult,
      tasksResult,
      notesResult,
      activitiesResult,
      allDeals,
      contactsResult,
      enrichmentResult,
      membersResult,
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

    pipelines = pipelinesResult;
    stages = stagesResult;
    tasks = tasksResult;
    notes = notesResult;
    activities = activitiesResult;
    deals = allDeals.filter((deal) => deal.lead_id === id);
    contacts = contactsResult;
    enrichment = enrichmentResult;
    members = membersResult;

    const readinessRow = await getCampaignReadinessForLead(orgId, id).catch(
      () => null,
    );
    const qualification = qualifyLead(lead);
    const opportunity = buildOpportunityRecord(lead, qualification);
    nextBestAction = opportunity.nextBestActions.primary.title;

    readiness = readinessRow
      ? {
          status: readinessRow.status,
          approvalStatus: readinessRow.approval_status,
          salesPriority: readinessRow.sales_priority ?? "standard",
          preferredEmail: readinessRow.preferred_email,
          preferredName: readinessRow.preferred_name,
          qualificationScore: readinessRow.qualification_score ?? 0,
          opportunityScore: readinessRow.opportunity_score ?? 0,
          reasons: readinessRow.reasons ?? [],
          missingRequirements: readinessRow.missing_requirements ?? [],
        }
      : null;
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Kon leadgegevens niet volledig laden.",
    );
  }

  return (
    <div>
      <PageHeader
        title={lead.company_name}
        description="Lead overview with funnel readiness, intelligence, timeline, notes, tasks and deals."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "CRM", href: "/crm" },
          { label: "Leads", href: "/crm/leads" },
          { label: lead.company_name },
        ]}
      />
      <CrmSubnav currentPath="/crm/leads" />
      {errorMessage ? (
        <div className="mb-4">
          <ReloadErrorAlert description={errorMessage} />
        </div>
      ) : null}
      <div className="mb-4">
        <LeadFunnelReadinessCard
          leadId={lead.id}
          readiness={readiness}
          nextBestAction={nextBestAction}
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
