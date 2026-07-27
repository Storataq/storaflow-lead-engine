import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ConvertCompanyToLeadButton } from "@/components/crm/convert-company-to-lead-button";
import { FunnelActivationPanel } from "@/components/crm/funnel-activation-panel";
import { CategoryIntelligencePanel } from "@/components/companies/category-intelligence-panel";
import { CompanyCategoryCard } from "@/components/companies/company-category-card";
import { WebsiteEnrichmentPanel } from "@/components/companies/website-enrichment-panel";
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
  getCompanyCategory,
  listCompanyCategories,
} from "@/lib/companies/categories/queries";
import {
  getCompanyClassification,
  listCompanyClassificationHistory,
} from "@/lib/companies/classification/queries";
import {
  getCompany,
  listCompanySources,
} from "@/lib/companies/queries";
import {
  getCampaignReadinessForLead,
  getLatestActivationForCompany,
} from "@/lib/crm/funnel-activation/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { createClient } from "@/lib/supabase/server";

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

  const [categories, assignedCategory, classification, classificationHistory] =
    await Promise.all([
      listCompanyCategories(context.organization.id).catch(() => []),
      company.company_category_id
        ? getCompanyCategory(
            context.organization.id,
            company.company_category_id,
          ).catch(() => null)
        : Promise.resolve(null),
      getCompanyClassification(context.organization.id, company.id).catch(
        () => null,
      ),
      listCompanyClassificationHistory(
        context.organization.id,
        company.id,
      ).catch(() => []),
    ]);

  const suggestedCategory = company.suggested_company_category_id
    ? await getCompanyCategory(
        context.organization.id,
        company.suggested_company_category_id,
      ).catch(() => null)
    : null;

  const canAssign =
    context.membership.role === "owner" ||
    context.membership.role === "admin";

  const enrichmentSource = [...sources]
    .reverse()
    .find((source) => {
      const meta = source.metadata_json;
      return (
        meta &&
        typeof meta === "object" &&
        !Array.isArray(meta) &&
        (meta as Record<string, unknown>).enrichment === true
      );
    });

  const enrichmentMeta =
    enrichmentSource?.metadata_json &&
    typeof enrichmentSource.metadata_json === "object" &&
    !Array.isArray(enrichmentSource.metadata_json)
      ? (enrichmentSource.metadata_json as Record<string, unknown>)
      : {};

  let lastStatus: string | null = null;
  if (enrichmentSource?.scrape_job_id) {
    const supabase = await createClient();
    const { data: job } = await supabase
      .from("scrape_jobs")
      .select("status, completed_at")
      .eq("organization_id", context.organization.id)
      .eq("id", enrichmentSource.scrape_job_id)
      .maybeSingle();
    lastStatus = job?.status ?? null;
  }

  const enrichmentSummary = {
    lastJobId: enrichmentSource?.scrape_job_id ?? null,
    lastStatus,
    lastCompletedAt: enrichmentSource?.discovered_at ?? null,
    emailsFound: Number(enrichmentMeta.emails ?? 0),
    phonesFound: Number(enrichmentMeta.phones ?? 0),
    pagesProcessed: Number(enrichmentMeta.pages ?? 0),
    contactPage:
      typeof enrichmentMeta.contactPage === "string"
        ? enrichmentMeta.contactPage
        : null,
    aboutPage:
      typeof enrichmentMeta.aboutPage === "string"
        ? enrichmentMeta.aboutPage
        : null,
    teamPage:
      typeof enrichmentMeta.teamPage === "string"
        ? enrichmentMeta.teamPage
        : null,
    availability:
      typeof enrichmentMeta.availability === "string"
        ? enrichmentMeta.availability
        : null,
    websiteUrl: company.website_url,
  };

  const activationRun = await getLatestActivationForCompany(
    context.organization.id,
    company.id,
  ).catch(() => null);

  const activationSummaryRaw =
    activationRun?.result_summary &&
    typeof activationRun.result_summary === "object" &&
    !Array.isArray(activationRun.result_summary)
      ? (activationRun.result_summary as Record<string, unknown>)
      : {};

  const readinessForLead = activationRun?.lead_id
    ? await getCampaignReadinessForLead(
        context.organization.id,
        activationRun.lead_id,
      ).catch(() => null)
    : null;

  const funnelSummary = {
    runId: activationRun?.id ?? null,
    status: activationRun?.status ?? null,
    leadId: activationRun?.lead_id ?? null,
    campaignStatus: readinessForLead?.status ?? null,
    salesPriority: readinessForLead?.sales_priority ?? null,
    preferredEmail: readinessForLead?.preferred_email ?? null,
    qualificationScore:
      typeof activationSummaryRaw.qualificationScore === "number"
        ? activationSummaryRaw.qualificationScore
        : readinessForLead?.qualification_score ?? null,
    opportunityScore:
      typeof activationSummaryRaw.opportunityScore === "number"
        ? activationSummaryRaw.opportunityScore
        : readinessForLead?.opportunity_score ?? null,
    lastActivatedAt: activationRun?.completed_at ?? activationRun?.created_at ?? null,
    warnings: [],
  };

  const websiteHref = safeExternalHref(company.website_url);
  const linkedinHref = safeExternalHref(company.linkedin_url);

  return (
    <div>
      <PageHeader
        title={company.company_name}
        description="Bedrijfsprofiel, website enrichment en funnel activation."
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

      <div className="mb-4 space-y-4">
        <CompanyCategoryCard
          companyId={company.id}
          category={assignedCategory}
          categories={categories}
          canAssign={canAssign}
        />
        <CategoryIntelligencePanel
          companyId={company.id}
          currentCategory={assignedCategory}
          suggestedCategory={suggestedCategory}
          classification={classification}
          history={classificationHistory}
          categories={categories}
          manualOverride={Boolean(company.category_manual_override)}
          needsReview={Boolean(company.category_needs_review)}
          confidence={
            company.category_confidence != null
              ? Number(company.category_confidence)
              : null
          }
          classifiedAt={company.category_classified_at}
          classifiedBy={company.category_classified_by}
          canManage={canAssign}
        />
        <WebsiteEnrichmentPanel
          companyId={company.id}
          websiteUrl={company.website_url}
          summary={enrichmentSummary}
        />
        <FunnelActivationPanel
          companyId={company.id}
          summary={funnelSummary}
        />
      </div>

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
