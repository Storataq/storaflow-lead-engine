import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { SearchesManager } from "@/components/searches/searches-manager";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { listSearchQueries } from "@/lib/searches/queries";
import type { SearchQueryRow } from "@/lib/searches/queries";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

export const metadata: Metadata = {
  title: "Zoekopdrachten",
};

async function SearchesContent() {
  const context = await getActiveOrganization();
  if (!context) {
    return null;
  }

  let items: SearchQueryRow[] = [];
  let errorMessage: string | null = null;

  try {
    items = await listSearchQueries({
      organizationId: context.organization.id,
    });
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Kon zoekopdrachten niet laden. Probeer het opnieuw.",
    );
  }

  return (
    <SearchesManager initialItems={items} initialError={errorMessage} />
  );
}

export default function ZoekopdrachtenPage() {
  return (
    <div>
      <PageHeader
        title="Zoekopdrachten"
        description="Beheer wereldwijde zoekcriteria: landen, talen, bronnen, keywords en AI-prompts."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Zoekopdrachten" },
        ]}
      />
      <Suspense fallback={<PageSkeleton filters={3} variant="table" />}>
        <SearchesContent />
      </Suspense>
    </div>
  );
}
