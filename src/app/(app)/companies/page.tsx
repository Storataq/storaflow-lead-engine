import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { CompaniesManager } from "@/components/companies/companies-manager";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { Button } from "@/components/ui/button";
import { listCompanyCategories } from "@/lib/companies/categories/queries";
import { listCompanies } from "@/lib/companies/queries";
import type { CompanyRow } from "@/lib/companies/queries";
import type { CompanyCategoryRow } from "@/lib/companies/categories/types";
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
  let categories: CompanyCategoryRow[] = [];
  let errorMessage: string | null = null;

  try {
    [items, categories] = await Promise.all([
      listCompanies(context.organization.id),
      listCompanyCategories(context.organization.id),
    ]);
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Kon bedrijven niet laden. Probeer het opnieuw.",
    );
  }

  const canAssign =
    context.membership.role === "owner" ||
    context.membership.role === "admin";

  return (
    <CompaniesManager
      initialItems={items}
      categories={categories}
      canAssign={canAssign}
      initialError={errorMessage}
    />
  );
}

export default function CompaniesPage() {
  return (
    <div>
      <PageHeader
        title="Bedrijven"
        description="Overzicht van gevonden bedrijven met status, categorie, bron en locatie."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Bedrijven" },
        ]}
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/companies/categories" />}
          >
            Categories
          </Button>
        }
      />
      <Suspense fallback={<PageSkeleton filters={2} variant="table" />}>
        <CompaniesContent />
      </Suspense>
    </div>
  );
}
