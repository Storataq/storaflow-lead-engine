import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ConvertCompanyToLeadButton } from "@/components/crm/convert-company-to-lead-button";
import { TruncatedText } from "@/components/layout/truncated-text";
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
  getCompany,
  listCompanySources,
} from "@/lib/companies/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

type CompanyDetailPageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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

export async function generateMetadata({
  params,
}: CompanyDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Bedrijf ${id.slice(0, 8)}` };
}

export default async function CompanyDetailPage({
  params,
}: CompanyDetailPageProps) {
  const { id } = await params;
  const context = await getActiveOrganization();
  if (!context) {
    notFound();
  }

  const company = await getCompany(context.organization.id, id);
  if (!company) {
    notFound();
  }

  const sources = await listCompanySources(
    context.organization.id,
    company.id,
  ).catch(() => []);

  const websiteHref = safeExternalHref(company.website_url);
  const linkedinHref = safeExternalHref(company.linkedin_url);

  return (
    <div>
      <PageHeader
        title={company.company_name}
        description="Bedrijfsgegevens uit mock scrapes. Contactverrijking volgt in een latere fase."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Bedrijven", href: "/companies" },
          { label: company.company_name },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <ConvertCompanyToLeadButton companyId={company.id} />
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/companies" />}
            >
              Terug naar overzicht
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Profiel</CardTitle>
            <CardDescription>
              Status:{" "}
              <Badge variant="secondary" className="align-middle">
                {company.status}
              </Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Stad</span>
              <span>{company.city ?? "—"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Regio</span>
              <span>{company.region ?? "—"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Land</span>
              <span>{company.country ?? "—"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Branche</span>
              <span>{company.industry ?? "—"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Website</span>
              {websiteHref ? (
                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="max-w-[60%] truncate font-medium underline-offset-4 hover:underline"
                  title={company.website_url ?? undefined}
                >
                  {company.website_url}
                </a>
              ) : (
                <span>—</span>
              )}
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">LinkedIn</span>
              {linkedinHref ? (
                <a
                  href={linkedinHref}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-medium underline-offset-4 hover:underline"
                >
                  Profiel
                </a>
              ) : (
                <span>—</span>
              )}
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Telefoon</span>
              <span>{company.phone ?? "—"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Eerst gevonden</span>
              <span>{formatDate(company.first_found_at)}</span>
            </div>
            {company.description ? (
              <p className="rounded-lg border border-border bg-muted/30 p-3 text-muted-foreground">
                {company.description}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Bronnen</CardTitle>
            <CardDescription>
              Waar dit bedrijf is ontdekt binnen je organisatie.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sources.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Geen bronnen gekoppeld.
              </p>
            ) : (
              <ul className="space-y-3">
                {sources.map((source) => (
                  <li
                    key={source.id}
                    className="rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge variant="outline">{source.source_type}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(source.discovered_at)}
                      </span>
                    </div>
                    <TruncatedText
                      value={source.source_url}
                      className="mt-1 text-foreground"
                      maxWidthClassName="max-w-full"
                    />
                    {source.scrape_job_id ? (
                      <Link
                        href={`/jobs/${source.scrape_job_id}`}
                        className="mt-1 inline-block text-xs font-medium underline-offset-4 hover:underline"
                      >
                        Bekijk scrape job
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
