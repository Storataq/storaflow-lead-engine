import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

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
import {
  formatCountryList,
  formatIndustryList,
  formatLanguageList,
} from "@/lib/international/display";
import { formatSourceList } from "@/lib/international/sources";

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

  return (
    <div>
      <PageHeader
        title={item.name}
        description="Opgeslagen zoekcriteria voor latere scraping."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Zoekopdrachten", href: "/zoekopdrachten" },
          { label: item.name },
        ]}
        actions={
          <Button
            nativeButton={false}
            render={<Link href="/zoekopdrachten" />}
            variant="outline"
          >
            Terug naar overzicht
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
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
              Countries, regions, languages, industries and keywords.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="mb-1 text-muted-foreground">Search prompt</p>
              <p className="whitespace-pre-wrap">
                {item.search_prompt?.trim() ? item.search_prompt : "—"}
              </p>
            </div>
            <div>
              <p className="mb-1 text-muted-foreground">Countries</p>
              <p>{formatCountryList(item.countries ?? [])}</p>
            </div>
            <div>
              <p className="mb-1 text-muted-foreground">Regions</p>
              <p>{(item.regions ?? []).join(", ") || "—"}</p>
            </div>
            <div>
              <p className="mb-1 text-muted-foreground">Cities</p>
              <p>{(item.cities ?? []).join(", ") || "—"}</p>
            </div>
            <div>
              <p className="mb-1 text-muted-foreground">Languages</p>
              <p>{formatLanguageList(item.languages ?? [])}</p>
            </div>
            <div>
              <p className="mb-1 text-muted-foreground">Industries</p>
              <p>{formatIndustryList(item.industries ?? [])}</p>
            </div>
            <div>
              <p className="mb-1 text-muted-foreground">Sources</p>
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
            <CardTitle className="text-base">Toekomstige resultaten</CardTitle>
            <CardDescription>
              Placeholder — scraping volgt in fase 3.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold tracking-tight">
            —
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Laatste activiteit</CardTitle>
            <CardDescription>
              Placeholder — workeractiviteit volgt later.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Nog geen scrapingactiviteit.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
