import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JobProgressBar } from "@/components/jobs/job-progress-bar";
import { JobRunnerControls } from "@/components/jobs/job-runner-controls";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MOCK_SCRAPE_TARGET_PAGES } from "@/lib/jobs/constants";
import {
  getScrapeJob,
  listCompaniesForJob,
} from "@/lib/jobs/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

type JobDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: JobDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Taak ${id.slice(0, 8)}` };
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const { id } = await params;
  const context = await getActiveOrganization();
  if (!context) {
    notFound();
  }

  const job = await getScrapeJob(context.organization.id, id);
  if (!job) {
    notFound();
  }

  const companies = await listCompaniesForJob(context.organization.id, id);
  const searchName = job.search_queries?.name ?? "Zoekopdracht";

  return (
    <div>
      <PageHeader
        title={searchName}
        description="Voortgang en mock-resultaten van deze scrape-taak."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Scrapingtaken", href: "/jobs" },
          { label: searchName },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            {job.search_query_id ? (
              <Button
                nativeButton={false}
                variant="outline"
                render={<Link href={`/zoekopdrachten/${job.search_query_id}`} />}
              >
                Zoekopdracht
              </Button>
            ) : null}
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/jobs" />}
            >
              Queue
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <JobStatusBadge status={job.status} />
          <span className="text-sm text-muted-foreground">{job.job_type}</span>
        </div>
        <JobRunnerControls jobId={job.id} status={job.status} />
      </div>

      <Card className="mb-4 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Voortgang</CardTitle>
          <CardDescription>
            Mock-engine verwerkt {MOCK_SCRAPE_TARGET_PAGES} pagina&apos;s zonder
            externe API&apos;s.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <JobProgressBar
            pagesProcessed={job.pages_processed}
            targetPages={MOCK_SCRAPE_TARGET_PAGES}
            status={job.status}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Pagina&apos;s</CardDescription>
            <CardTitle className="text-2xl">
              {job.pages_processed}/{MOCK_SCRAPE_TARGET_PAGES}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Bedrijven</CardDescription>
            <CardTitle className="text-2xl">{job.companies_found}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Contacten</CardDescription>
            <CardTitle className="text-2xl">{job.contacts_found}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Gestart</CardDescription>
            <CardTitle className="text-base font-medium">
              {formatDate(job.started_at)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Job ID</span>
              <code className="text-xs">{job.id}</code>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Aangemaakt</span>
              <span>{formatDate(job.created_at)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Afgerond</span>
              <span>{formatDate(job.completed_at)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Claim</span>
              <span>{job.claimed_by ?? "—"}</span>
            </div>
            {job.error_message ? (
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-muted-foreground">
                {job.error_message}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Mock-bedrijven</CardTitle>
            <CardDescription>
              Gegenereerd uit de zoekopdracht — geen internetscraping.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {companies.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nog geen bedrijven. De mock-engine vult dit tijdens Active.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bedrijf</TableHead>
                      <TableHead>Stad</TableHead>
                      <TableHead>Land</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.map((company) => (
                      <TableRow key={company.id}>
                        <TableCell>
                          <Link
                            href={`/companies/${company.id}`}
                            className="font-medium hover:underline"
                          >
                            {company.company_name}
                          </Link>
                          {company.website_url ? (
                            <p className="truncate text-xs text-muted-foreground">
                              {company.website_url}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {company.city ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {company.country ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
