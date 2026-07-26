import type { Metadata } from "next";

import { CrmSubnav } from "@/components/crm/crm-subnav";
import { LeadQualificationDashboard } from "@/components/crm/lead-qualification-dashboard";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { listLeads } from "@/lib/crm/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

export const metadata: Metadata = {
  title: "Lead Qualification",
};

export default async function LeadQualificationPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  let errorMessage: string | null = null;
  let leads: Awaited<ReturnType<typeof listLeads>> = [];

  try {
    leads = await listLeads(context.organization.id);
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Kon leads niet laden voor qualification.",
    );
  }

  return (
    <div>
      <PageHeader
        title="Lead Qualification"
        description="Mock qualification engine voor prioritization — geen AI of externe API's."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "CRM", href: "/crm" },
          { label: "Lead Qualification" },
        ]}
      />
      <CrmSubnav currentPath="/crm/qualification" />
      {errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : (
        <LeadQualificationDashboard leads={leads} />
      )}
    </div>
  );
}
