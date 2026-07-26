import type { Metadata } from "next";
import { Suspense } from "react";

import { JobsQueue } from "@/components/jobs/jobs-queue";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import {
  listScrapeJobs,
  type ScrapeJobWithSearch,
} from "@/lib/jobs/queries";

export const metadata: Metadata = {
  title: "Scrapingtaken",
};

async function JobsContent() {
  const context = await getActiveOrganization();
  if (!context) {
    return null;
  }

  let items: ScrapeJobWithSearch[] = [];
  let errorMessage: string | null = null;

  try {
    items = await listScrapeJobs({
      organizationId: context.organization.id,
    });
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "Kon scrapingtaken niet laden.";
  }

  return <JobsQueue initialItems={items} initialError={errorMessage} />;
}

function JobsLoading() {
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-36" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

export default function JobsPage() {
  return (
    <div>
      <PageHeader
        title="Scrapingtaken"
        description="Queue van Pending, Active, Completed, Failed en Paused scrapes (mock-engine)."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Scrapingtaken" },
        ]}
      />
      <Suspense fallback={<JobsLoading />}>
        <JobsContent />
      </Suspense>
    </div>
  );
}
