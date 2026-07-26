import type { Metadata } from "next";

import { CrmSubnav } from "@/components/crm/crm-subnav";
import { OpportunityInsightsDashboard } from "@/components/crm/opportunity-insights-dashboard";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { listLeads } from "@/lib/crm/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

export const metadata: Metadata = {
  title: "Opportunity Insights",
};

export default async function OpportunityInsightsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  let errorMessage: string | null = null;
  let leads: Awaited<ReturnType<typeof listLeads>> = [];

  try {
    leads = await listLeads(context.organization.id);
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Kon opportunities niet laden vanuit CRM leads.",
    );
  }

  return (
    <div>
      <PageHeader
        title="Opportunity Insights"
        description="Commerciële decision-support op basis van qualification en CRM-data. Geen AI, geen live outreach."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "CRM", href: "/crm" },
          { label: "Opportunity Insights" },
        ]}
      />
      <CrmSubnav currentPath="/crm/opportunities" />
      {errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : (
        <OpportunityInsightsDashboard leads={leads} />
      )}
    </div>
  );
}
