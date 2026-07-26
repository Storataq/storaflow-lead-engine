import type { Metadata } from "next";
import { Suspense } from "react";

import { JobsQueue } from "@/components/jobs/jobs-queue";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import {
  listScrapeJobs,
  type ScrapeJobWithSearch,
} from "@/lib/jobs/queries";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

export const metadata: Metadata = {
  title: "Scrape Jobs",
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
    errorMessage = toUserFacingError(
      error,
      "Kon scrapingtaken niet laden. Probeer het opnieuw.",
    );
  }

  return <JobsQueue initialItems={items} initialError={errorMessage} />;
}

export default function JobsPage() {
  return (
    <div>
      <PageHeader
        title="Scrape Jobs"
        description="Jobwachtrij met mock-uitvoering: pending, queued, running, paused, completed, failed of cancelled."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Scrape Jobs" },
        ]}
      />
      <Suspense fallback={<PageSkeleton filters={4} variant="table" />}>
        <JobsContent />
      </Suspense>
    </div>
  );
}
