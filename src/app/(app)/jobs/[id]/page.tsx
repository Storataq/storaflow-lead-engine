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
import { formatRuntimeMs, jobPriorityLabel } from "@/lib/jobs/constants";
import {
  getScrapeJob,
  listCompaniesForJob,
  listJobLogs,
  listJobResults,
} from "@/lib/jobs/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

type JobDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: JobDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Scrape Job ${id.slice(0, 8)}` };
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

  const orgId = context.organization.id;
  const job = await getScrapeJob(orgId, id);
  if (!job) {
    notFound();
  }

  const [companies, logs, results] = await Promise.all([
    listCompaniesForJob(orgId, id),
    listJobLogs(orgId, id).catch(() => []),
    listJobResults(orgId, id).catch(() => []),
  ]);

  const searchName = job.search_queries?.name ?? "Zoekopdracht";

  return (
    <div>
      <PageHeader
        title={searchName}
        description="Queue engine + MockWorker — lokale progress-simulatie."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Scrape Jobs", href: "/jobs" },
          { label: searchName },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            {job.search_query_id ? (
              <Button
                nativeButton={false}
                variant="outline"
                render={
                  <Link href={`/zoekopdrachten/${job.search_query_id}`} />
                }
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

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <JobStatusBadge status={job.status} />
          <span className="text-sm text-muted-foreground">
            Prioriteit: {jobPriorityLabel(job.priority)}
          </span>
          <span className="text-sm text-muted-foreground">
            Bron: {job.current_source_code ?? "—"}
          </span>
          <span className="text-sm text-muted-foreground">
            Retries: {job.retry_count}
          </span>
        </div>
        <JobRunnerControls jobId={job.id} status={job.status} />
      </div>

      <Card className="mb-4 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Voortgang</CardTitle>
          <CardDescription>
            Progress {job.progress_percent}% · stap {job.pages_processed}/
            {job.pages_total || job.target_pages}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <JobProgressBar
            pagesProcessed={job.pages_processed}
            targetPages={job.pages_total || job.target_pages}
            progressPercent={job.progress_percent}
            status={job.status}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Gevonden</CardDescription>
            <CardTitle className="text-2xl">{job.companies_found}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Fouten</CardDescription>
            <CardTitle className="text-2xl">{job.error_count}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Runtime</CardDescription>
            <CardTitle className="text-2xl">
              {formatRuntimeMs(job.runtime_ms)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Heartbeat</CardDescription>
            <CardTitle className="text-base font-medium">
              {formatDate(job.last_heartbeat_at)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Job informatie</CardTitle>
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
              <span className="text-muted-foreground">Gestart</span>
              <span>{formatDate(job.started_at)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Einde</span>
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
            <CardTitle className="text-base">Timeline / Logs</CardTitle>
            <CardDescription>
              Job Created → Queued → Worker Assigned → Started → Progress →
              Completed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nog geen logs. Voer migratie 000006 uit als tabellen ontbreken.
              </p>
            ) : (
              <ul className="max-h-80 space-y-2 overflow-y-auto text-sm">
                {logs.map((log) => (
                  <li
                    key={log.id}
                    className="rounded-lg border border-border px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{log.event_code}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(log.created_at)}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{log.message}</p>
                    {log.source_code ? (
                      <p className="text-xs text-muted-foreground">
                        source: {log.source_code}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Resultaten</CardTitle>
            <CardDescription>
              scrape_results rijen van de connector.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nog geen resultaten.
              </p>
            ) : (
              <div className="max-h-80 overflow-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bedrijf</TableHead>
                      <TableHead>Bron</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell>
                          <p className="font-medium">{result.company_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {[result.city, result.country]
                              .filter(Boolean)
                              .join(", ") || "—"}
                          </p>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {result.source_code}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {result.status}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Mock bedrijven</CardTitle>
            <CardDescription>
              Opgeslagen in companies (+ company_sources).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {companies.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nog geen bedrijven.
              </p>
            ) : (
              <div className="max-h-80 overflow-auto rounded-lg border border-border">
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
