import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { SearchDetailActions } from "@/components/searches/search-detail-actions";
import { SearchStatusBadge } from "@/components/searches/search-status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatCountryList,
  formatIndustryList,
  formatLanguageList,
} from "@/lib/international/display";
import { formatSourceList } from "@/lib/international/sources";
import { formatRuntimeMs } from "@/lib/jobs/constants";
import { jobLifecycleLabel, jobLifecyclePhase } from "@/lib/jobs/lifecycle";
import { listScrapeJobsForSearch } from "@/lib/jobs/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { buildSearchQueryPreview } from "@/lib/searches/preview";
import { getSearchQuery } from "@/lib/searches/queries";
import { formatDateTime } from "@/lib/ui/format";

type SearchDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: SearchDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Zoekopdracht ${id.slice(0, 8)}` };
}

export default async function ZoekopdrachtDetailPage({
  params,
}: SearchDetailPageProps) {
  const { id } = await params;
  const context = await getActiveOrganization();
  if (!context) {
    notFound();
  }

  const item = await getSearchQuery(context.organization.id, id);
  if (!item) {
    notFound();
  }

  const jobs = await listScrapeJobsForSearch(
    context.organization.id,
    id,
    8,
  ).catch(() => []);

  const latest = jobs[0] ?? null;
  const preview = buildSearchQueryPreview({
    name: item.name,
    searchPrompt: item.search_prompt ?? "",
    countries: item.countries ?? [],
    regions: item.regions ?? [],
    cities: item.cities ?? [],
    languages: item.languages ?? [],
    industries: item.industries ?? [],
    sources: item.sources ?? [],
    keywords: item.keywords ?? [],
    companySize: item.company_size ?? "",
    websiteRequired: item.website_required,
    linkedinRequired: item.linkedin_required,
    status: item.status,
  });

  return (
    <div>
      <PageHeader
        title={item.name}
        description="Opgeslagen zoekcriteria — start een scrape via OpenStreetMap (live) of mock connectors."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Zoekopdrachten", href: "/zoekopdrachten" },
          { label: item.name },
        ]}
        actions={<SearchDetailActions item={item} />}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Zoekopdracht-preview</CardTitle>
            <CardDescription>
              Samenvatting van alle actieve criteria.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-3 font-sans text-sm leading-relaxed">
              {preview}
            </pre>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(item.countries ?? []).map((code) => (
                <Badge key={`c-${code}`} variant="secondary">
                  {formatCountryList([code])}
                </Badge>
              ))}
              {(item.keywords ?? []).slice(0, 8).map((keyword) => (
                <Badge key={`k-${keyword}`} variant="outline">
                  {keyword}
                </Badge>
              ))}
              {(item.sources ?? []).map((code) => (
                <Badge key={`s-${code}`} variant="outline">
                  {formatSourceList([code])}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Scrape-status</CardTitle>
            <CardDescription>
              Voortgang van de meest recente search job voor deze zoekopdracht.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {latest ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-border px-3 py-2">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <JobStatusBadge status={latest.status} />
                      <span className="text-xs text-muted-foreground">
                        {jobLifecycleLabel(
                          jobLifecyclePhase(latest.status, {
                            hadFailure: latest.retry_count > 0,
                          }),
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border px-3 py-2">
                    <p className="text-xs text-muted-foreground">Voortgang</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">
                      {latest.progress_percent}%
                    </p>
                  </div>
                  <div className="rounded-lg border border-border px-3 py-2">
                    <p className="text-xs text-muted-foreground">Connector</p>
                    <p className="mt-1 text-sm font-medium">
                      {latest.current_source_code ?? "—"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border px-3 py-2">
                    <p className="text-xs text-muted-foreground">Worker</p>
                    <p className="mt-1 text-sm font-medium">
                      {latest.claimed_by ?? "Nog niet geclaimd"}
                    </p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 text-sm">
                  <div>
                    <p className="text-muted-foreground">Verwerkt</p>
                    <p className="font-medium">{latest.companies_found}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Contacten</p>
                    <p className="font-medium">{latest.contacts_found}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Fouten</p>
                    <p className="font-medium">{latest.error_count}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Runtime</p>
                    <p className="font-medium">
                      {formatRuntimeMs(latest.runtime_ms)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Laatste update</p>
                    <p className="font-medium">
                      {formatDateTime(
                        latest.last_heartbeat_at ?? latest.updated_at,
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/jobs/${latest.id}`}
                    className="text-sm font-medium underline-offset-4 hover:underline"
                  >
                    Open jobdetail
                  </Link>
                  <Link
                    href="/jobs"
                    className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                  >
                    Alle scrapingtaken
                  </Link>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nog geen scrape gestart. Gebruik “Start scrape” om een job te
                queueen. Standaardconnector: OpenStreetMap (live Nominatim).
              </p>
            )}

            {jobs.length > 1 ? (
              <ul className="space-y-2 border-t border-border pt-3">
                {jobs.slice(1).map((job) => (
                  <li
                    key={job.id}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm"
                  >
                    <Link
                      href={`/jobs/${job.id}`}
                      className="font-medium hover:underline"
                    >
                      {formatDateTime(job.created_at)} ·{" "}
                      {job.current_source_code ?? "connector"}
                    </Link>
                    <JobStatusBadge status={job.status} />
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Basisgegevens</CardTitle>
            <CardDescription>Naam, status en metadata.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Status</span>
              <SearchStatusBadge status={item.status} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Aangemaakt</span>
              <span>{formatDateTime(item.created_at)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Laatst gewijzigd</span>
              <span>{formatDateTime(item.updated_at)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Website verplicht</span>
              <span>{item.website_required ? "Ja" : "Nee"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">LinkedIn verplicht</span>
              <span>{item.linkedin_required ? "Ja" : "Nee"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Bedrijfsgrootte</span>
              <span>{item.company_size ?? "—"}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
            <CardDescription>
              Locatie, talen, branches, bronnen en keywords.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="mb-1 text-muted-foreground">AI Search Prompt</p>
              <p className="whitespace-pre-wrap">
                {item.search_prompt?.trim() ? item.search_prompt : "—"}
              </p>
            </div>
            <div>
              <p className="mb-1 text-muted-foreground">Landen</p>
              <p>{formatCountryList(item.countries ?? [])}</p>
            </div>
            <div>
              <p className="mb-1 text-muted-foreground">Regio&apos;s</p>
              <p>{(item.regions ?? []).join(", ") || "—"}</p>
            </div>
            <div>
              <p className="mb-1 text-muted-foreground">Steden</p>
              <p>{(item.cities ?? []).join(", ") || "—"}</p>
            </div>
            <div>
              <p className="mb-1 text-muted-foreground">Talen</p>
              <p>{formatLanguageList(item.languages ?? [])}</p>
            </div>
            <div>
              <p className="mb-1 text-muted-foreground">Branches</p>
              <p>{formatIndustryList(item.industries ?? [])}</p>
            </div>
            <div>
              <p className="mb-1 text-muted-foreground">Databronnen</p>
              <p>{formatSourceList(item.sources ?? [])}</p>
            </div>
            <div>
              <p className="mb-1 text-muted-foreground">Keywords</p>
              <ul className="list-inside list-disc">
                {(item.keywords ?? []).length > 0 ? (
                  item.keywords.map((keyword) => (
                    <li key={keyword}>{keyword}</li>
                  ))
                ) : (
                  <li>—</li>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
