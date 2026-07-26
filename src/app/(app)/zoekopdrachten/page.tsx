import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { SearchesManager } from "@/components/searches/searches-manager";
import { Skeleton } from "@/components/ui/skeleton";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { listSearchQueries } from "@/lib/searches/queries";
import type { SearchQueryRow } from "@/lib/searches/queries";

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
    errorMessage =
      error instanceof Error ? error.message : "Kon zoekopdrachten niet laden.";
  }

  return (
    <SearchesManager initialItems={items} initialError={errorMessage} />
  );
}

function SearchesLoading() {
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-8 w-36" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
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
      <Suspense fallback={<SearchesLoading />}>
        <SearchesContent />
      </Suspense>
    </div>
  );
}
