import type { Metadata } from "next";

import { FunnelActivationDashboard } from "@/components/crm/funnel-activation-dashboard";
import { CrmSubnav } from "@/components/crm/crm-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { PageErrorState } from "@/components/layout/page-error-state";
import { listCompanies } from "@/lib/companies/queries";
import { getFunnelDashboardStats } from "@/lib/crm/funnel-activation/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

export const metadata: Metadata = {
  title: "Funnel Activation",
};

export default async function FunnelActivationPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  let stats = null;
  let companies: Array<{
    id: string;
    company_name: string;
    website_url: string | null;
  }> = [];
  let errorMessage: string | null = null;

  try {
    const [dashboard, companyRows] = await Promise.all([
      getFunnelDashboardStats(context.organization.id),
      listCompanies(context.organization.id).catch(() => []),
    ]);
    stats = dashboard;
    companies = companyRows.map((c) => ({
      id: c.id,
      company_name: c.company_name,
      website_url: c.website_url,
    }));
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Kon funnel dashboard niet laden. Voer migratie 20260726000010_funnel_activation.sql uit indien nodig.",
    );
  }

  if (errorMessage || !stats) {
    return (
      <div>
        <PageHeader
          title="Funnel Activation"
          description="Orchestrate company → lead → pipeline → campaign readiness."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "CRM", href: "/crm" },
            { label: "Funnel Activation" },
          ]}
        />
        <CrmSubnav currentPath="/crm/funnel-activation" />
        <PageErrorState
          title="Funnel Activation"
          description={errorMessage ?? "Onbekende fout."}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Funnel Activation"
        description="Controlled activation from scrape/enrichment into CRM — no email send."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "CRM", href: "/crm" },
          { label: "Funnel Activation" },
        ]}
      />
      <CrmSubnav currentPath="/crm/funnel-activation" />
      <FunnelActivationDashboard stats={stats} companies={companies} />
    </div>
  );
}
