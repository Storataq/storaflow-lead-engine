import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StartScrapeButton } from "@/components/jobs/start-scrape-button";
import { PageHeader } from "@/components/layout/page-header";
import { SearchStatusBadge } from "@/components/searches/search-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { getSearchQuery } from "@/lib/searches/queries";
import { buildSearchQueryPreview } from "@/lib/searches/preview";
import {
  formatCountryList,
  formatIndustryList,
  formatLanguageList,
} from "@/lib/international/display";
import { formatSourceList } from "@/lib/international/sources";
import { Badge } from "@/components/ui/badge";

type SearchDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: SearchDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Zoekopdracht ${id.slice(0, 8)}` };
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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
        description="Opgeslagen zoekcriteria — start een mock-scrape om bedrijven te verzamelen."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Zoekopdrachten", href: "/zoekopdrachten" },
          { label: item.name },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <StartScrapeButton searchQueryId={item.id} />
            <Button
              nativeButton={false}
              render={<Link href="/zoekopdrachten" />}
              variant="outline"
            >
              Terug naar overzicht
            </Button>
          </div>
        }
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
              <span>{formatDate(item.created_at)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Laatst gewijzigd</span>
              <span>{formatDate(item.updated_at)}</span>
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

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Scrape</CardTitle>
            <CardDescription>
              Start de mock-engine om bedrijven te verzamelen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <StartScrapeButton searchQueryId={item.id} />
            <p className="text-sm text-muted-foreground">
              Taken verschijnen in{" "}
              <Link href="/jobs" className="underline-offset-4 hover:underline">
                Scrapingtaken
              </Link>
              .
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Laatste activiteit</CardTitle>
            <CardDescription>
              Jobvoortgang zie je op de scrape-detailpagina.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Gebruik “Start scrape” om een Pending → Active → Completed flow te
            draaien met mock-bedrijven.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
