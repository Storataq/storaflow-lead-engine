import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JobProgressBar } from "@/components/jobs/job-progress-bar";
import { JobRunnerControls } from "@/components/jobs/job-runner-controls";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
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

function readPayloadString(
  payload: unknown,
  key: string,
): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const value = (payload as Record<string, unknown>)[key];
  if (typeof value === "string" && value.trim()) return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function readConfidence(payload: unknown): string {
  const raw = readPayloadString(payload, "confidence");
  if (!raw) return "—";
  const num = Number(raw);
  return Number.isFinite(num) ? num.toFixed(2) : "—";
}

function safeExternalHref(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function logLevelVariant(
  level: string,
): "secondary" | "outline" | "destructive" {
  switch (level) {
    case "error":
      return "destructive";
    case "warn":
      return "outline";
    default:
      return "secondary";
  }
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
        description={
          job.current_source_code === "openstreetmap"
            ? "Live OpenStreetMap (Nominatim) scrape via Scraper Engine."
            : job.current_source_code === "google_maps"
              ? "Google Maps connector MVP (mock) — persistente resultaten via de pipeline."
              : "Scraper Engine — connector-pipeline met persistente resultaten."
        }
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
            Connector: {job.current_source_code ?? "mock"}
          </span>
          <span className="text-sm text-muted-foreground">
            Prioriteit: {jobPriorityLabel(job.priority)}
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
            {job.progress_percent}% · pipeline-stappen {job.pages_processed}/
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
              <span className="text-muted-foreground">Zoekopdracht</span>
              <span>{searchName}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Connector</span>
              <span>{job.current_source_code ?? "mock"}</span>
            </div>
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
              <span className="text-muted-foreground">Worker</span>
              <span>{job.claimed_by ?? "—"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Mode</span>
              <span>
                {job.current_source_code === "openstreetmap" ? "Live" : "Mock"}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Claim</span>
              <span>{job.claimed_at ? formatDate(job.claimed_at) : "—"}</span>
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
              Job created → Queued → Started → Connector → Pipeline → Persisted
              → Completed.
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
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={logLevelVariant(log.level)}>
                          {log.level}
                        </Badge>
                        <span className="font-medium">{log.event_code}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(log.created_at)}
                      </span>
                    </div>
                    <p className="mt-1 text-muted-foreground">{log.message}</p>
                    {log.source_code ? (
                      <p className="text-xs text-muted-foreground">
                        connector: {log.source_code}
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
            <CardTitle className="text-base">Opgeslagen resultaten</CardTitle>
            <CardDescription>
              Persistente scrape_results uit de database.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nog geen resultaten.
              </p>
            ) : (
              <div className="max-h-96 overflow-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bedrijfsnaam</TableHead>
                      <TableHead>Land</TableHead>
                      <TableHead>Stad</TableHead>
                      <TableHead>Branche</TableHead>
                      <TableHead>Website</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Telefoon</TableHead>
                      <TableHead>Bron</TableHead>
                      <TableHead>Confidence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result) => {
                      const websiteHref = safeExternalHref(result.website_url);
                      return (
                        <TableRow key={result.id}>
                          <TableCell className="font-medium">
                            {result.company_name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {result.country ?? "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {result.city ?? "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {result.industry ?? "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {websiteHref ? (
                              <a
                                href={websiteHref}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="underline-offset-4 hover:underline"
                              >
                                {result.website_url}
                              </a>
                            ) : (
                              (result.website_url ?? "—")
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {readPayloadString(result.raw_payload, "emails") ??
                              "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {readPayloadString(result.raw_payload, "phones") ??
                              "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {result.source_code}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {readConfidence(result.raw_payload)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Opgeslagen bedrijven</CardTitle>
            <CardDescription>
              companies + company_sources voor deze job (org-scoped).
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
