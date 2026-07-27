import type { Metadata } from "next";

import { CategoriesManager } from "@/components/companies/categories-manager";
import { PageHeader } from "@/components/layout/page-header";
import { ReloadErrorAlert } from "@/components/layout/reload-error-alert";
import { listCompanyCategoriesWithCounts } from "@/lib/companies/categories/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

export const metadata: Metadata = {
  title: "Company Categories",
};

export default async function CompanyCategoriesSettingsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  let errorMessage: string | null = null;
  let categories: Awaited<
    ReturnType<typeof listCompanyCategoriesWithCounts>
  > = [];

  try {
    categories = await listCompanyCategoriesWithCounts(context.organization.id);
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Kon categorieën niet laden. Controleer of migratie 000023 is uitgevoerd.",
    );
  }

  const canManage =
    context.membership.role === "owner" ||
    context.membership.role === "admin";

  return (
    <div>
      <PageHeader
        title="Company Categories"
        description="Beheer de organisatie-categorieën die bedrijven classificeren voor CRM, search, scraping en campagnes."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Instellingen", href: "/settings" },
          { label: "Company Categories" },
        ]}
      />
      {errorMessage ? (
        <ReloadErrorAlert description={errorMessage} />
      ) : (
        <CategoriesManager categories={categories} canManage={canManage} />
      )}
    </div>
  );
}
