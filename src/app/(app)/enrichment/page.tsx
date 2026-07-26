import type { Metadata } from "next";

import { EnrichmentDashboard } from "@/components/enrichment/enrichment-dashboard";
import { PageHeader } from "@/components/layout/page-header";
import { PageErrorState } from "@/components/layout/page-error-state";
import { listCompanies } from "@/lib/companies/queries";
import { getEnrichmentDashboardStats } from "@/lib/enrichment/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

export const metadata: Metadata = {
  title: "Website Enrichment",
};

export default async function EnrichmentPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  let errorMessage: string | null = null;
  let stats = null;
  let withWebsite: Array<{
    id: string;
    company_name: string;
    website_url: string | null;
  }> = [];

  try {
    const [dashboardStats, companies] = await Promise.all([
      getEnrichmentDashboardStats(context.organization.id),
      listCompanies(context.organization.id).catch(() => []),
    ]);
    stats = dashboardStats;
    withWebsite = companies
      .filter((c) => Boolean(c.website_url?.trim()))
      .map((c) => ({
        id: c.id,
        company_name: c.company_name,
        website_url: c.website_url,
      }));
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Kon enrichment-statistieken niet laden.",
    );
  }

  if (errorMessage || !stats) {
    return (
      <PageErrorState
        title="Enrichment dashboard"
        description={errorMessage ?? "Kon enrichment-statistieken niet laden."}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Website Enrichment"
        description="Contact discovery vanaf publieke bedrijfswebsites. Geen e-mailverzending."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Website Enrichment" },
        ]}
      />
      <EnrichmentDashboard
        stats={stats}
        companiesWithWebsite={withWebsite}
      />
    </div>
  );
}
