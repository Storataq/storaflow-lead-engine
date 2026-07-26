import type { Metadata } from "next";
import { Suspense } from "react";

import { CompaniesManager } from "@/components/companies/companies-manager";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { listCompanies } from "@/lib/companies/queries";
import type { CompanyRow } from "@/lib/companies/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

export const metadata: Metadata = {
  title: "Bedrijven",
};

async function CompaniesContent() {
  const context = await getActiveOrganization();
  if (!context) {
    return null;
  }

  let items: CompanyRow[] = [];
  let errorMessage: string | null = null;

  try {
    items = await listCompanies(context.organization.id);
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Kon bedrijven niet laden. Probeer het opnieuw.",
    );
  }

  return (
    <CompaniesManager initialItems={items} initialError={errorMessage} />
  );
}

export default function CompaniesPage() {
  return (
    <div>
      <PageHeader
        title="Bedrijven"
        description="Overzicht van gevonden bedrijven met status, bron en locatie."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Bedrijven" },
        ]}
      />
      <Suspense fallback={<PageSkeleton filters={2} variant="table" />}>
        <CompaniesContent />
      </Suspense>
    </div>
  );
}
