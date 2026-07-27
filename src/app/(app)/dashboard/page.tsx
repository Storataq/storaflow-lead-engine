import type { Metadata } from "next";
import {
  Activity,
  Building2,
  CheckCircle2,
  Handshake,
  ListTodo,
  Mail,
  Search,
  Trophy,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";

import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { SearchStatusBadge } from "@/components/searches/search-status-badge";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { countCompanies } from "@/lib/companies/queries";
import { countCompaniesByCategory } from "@/lib/companies/categories/queries";
import { getClassificationDashboardStats } from "@/lib/companies/classification/queries";
import { countContactSignals } from "@/lib/contacts/queries";
import { formatDealValue } from "@/lib/crm/constants";
import { getCrmDashboardStats } from "@/lib/crm/queries";
import { formatCountryList } from "@/lib/international/display";
import { listScrapeJobs } from "@/lib/jobs/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { listSearchQueries } from "@/lib/searches/queries";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const context = await getActiveOrganization();
  const orgId = context?.organization.id;
  const searches = orgId
    ? await listSearchQueries({
        organizationId: orgId,
        sort: "newest",
      }).catch(() => [])
    : [];
  const jobs = orgId
    ? await listScrapeJobs({
        organizationId: orgId,
        sort: "newest",
      }).catch(() => [])
    : [];
  const companyCount = orgId
    ? await countCompanies(orgId).catch(() => 0)
    : 0;
  const companiesByCategory = orgId
    ? await countCompaniesByCategory(orgId).catch(() => [])
    : [];
  const classificationStats = orgId
    ? await getClassificationDashboardStats(orgId).catch(() => null)
    : null;
  const contactCount = orgId
    ? await countContactSignals(orgId).catch(() => 0)
    : 0;
  const crmStats = orgId
    ? await getCrmDashboardStats(orgId).catch(() => null)
    : null;
  const recentSearches = searches.slice(0, 5);
  const recentJobs = jobs.slice(0, 5);
  const activeSearchCount = searches.filter(
    (item) => item.status === "active",
  ).length;
  const activeJobs = jobs.filter((item) => {
    const s = item.status;
    return (
      s === "pending" ||
      s === "queued" ||
      s === "active" ||
      s === "running"
    );
  }).length;
  const failedJobs = jobs.filter((item) => item.status === "failed").length;

  const stats = [
    {
      label: "Bedrijven",
      value: String(companyCount),
      icon: Building2,
      href: "/companies",
    },
    {
      label: "Contactgegevens",
      value: String(contactCount),
      icon: Mail,
      href: "/contacts",
    },
    {
      label: "Zoekopdrachten",
      value: String(searches.length),
      icon: Search,
      href: "/zoekopdrachten",
    },
    {
      label: "Actieve zoekopdrachten",
      value: String(activeSearchCount),
      icon: CheckCircle2,
      href: "/zoekopdrachten",
    },
    {
      label: "Actieve scrape jobs",
      value: String(activeJobs),
      icon: ListTodo,
      href: "/jobs",
    },
    {
      label: "Mislukte scrape jobs",
      value: String(failedJobs),
      icon: XCircle,
      href: "/jobs",
    },
  ] as const;

  const crmWidgets = [
    {
      label: "Nieuwe leads (7d)",
      value: String(crmStats?.newLeadsCount ?? 0),
      icon: Users,
      href: "/crm/leads",
    },
    {
      label: "Pipeline waarde",
      value: formatDealValue(crmStats?.pipelineValue ?? 0),
      icon: Handshake,
      href: "/crm/deals",
    },
    {
      label: "Taken vandaag",
      value: String(crmStats?.tasksDueToday ?? 0),
      icon: CheckCircle2,
      href: "/crm/tasks",
    },
    {
      label: "Gewonnen deze maand",
      value: String(crmStats?.wonDealsCount ?? 0),
      icon: Trophy,
      href: "/crm/leads",
    },
  ] as const;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of leads, CRM pipeline, scrape jobs and recent activity."
        breadcrumbs={[{ label: "Dashboard" }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button nativeButton={false} variant="outline" render={<Link href="/crm/leads" />}>
              <Users className="size-4" />
              CRM
            </Button>
            <Button nativeButton={false} render={<Link href="/zoekopdrachten" />}>
              <Search className="size-4" />
              Nieuwe zoekopdracht
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="group">
            <Card className="h-full shadow-none transition-colors group-hover:bg-muted/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 sm:p-6 sm:pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
                  {stat.label}
                </CardTitle>
                <stat.icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                <div className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-8 shadow-none">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Companies by Category</CardTitle>
            <CardDescription>
              Top categories for this organization.
            </CardDescription>
          </div>
          <Button
            nativeButton={false}
            variant="outline"
            size="sm"
            render={<Link href="/settings/company-categories" />}
          >
            Manage
          </Button>
        </CardHeader>
        <CardContent>
          {companiesByCategory.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="Nog geen categoriedata"
              description="Wijs categorieën toe aan bedrijven om dit overzicht te vullen."
              actionLabel="Naar bedrijven"
              actionHref="/companies"
            />
          ) : (
            <div className="space-y-3">
              {companiesByCategory.slice(0, 8).map((row) => {
                const max = companiesByCategory[0]?.count || 1;
                const width = Math.max(8, Math.round((row.count / max) * 100));
                return (
                  <div key={`${row.categoryId ?? "none"}-${row.name}`}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium">{row.name}</span>
                      <span className="text-muted-foreground">{row.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${width}%`,
                          backgroundColor: row.color ?? "#64748B",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/companies" className="group">
          <Card className="h-full shadow-none transition-colors group-hover:bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Companies needing review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tracking-tight">
                {classificationStats?.needingReview ?? 0}
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/companies" className="group">
          <Card className="h-full shadow-none transition-colors group-hover:bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Unknown / low confidence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tracking-tight">
                {classificationStats?.unknown ?? 0}
              </div>
            </CardContent>
          </Card>
        </Link>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average confidence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">
              {classificationStats?.avgConfidence != null
                ? `${classificationStats.avgConfidence}%`
                : "—"}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Manual overrides
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">
              {classificationStats?.manualOverrides ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Top detected categories</CardTitle>
          <CardDescription>
            Most frequent AI-suggested categories across companies.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!classificationStats || classificationStats.topDetected.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="Nog geen classificaties"
              description="Classificeer bedrijven na scrape, enrichment of handmatig via Reclassify."
              actionLabel="Naar bedrijven"
              actionHref="/companies"
            />
          ) : (
            <div className="space-y-3">
              {classificationStats.topDetected.map((row) => {
                const max = classificationStats.topDetected[0]?.count || 1;
                const width = Math.max(8, Math.round((row.count / max) * 100));
                return (
                  <div key={row.categoryId}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium">{row.name}</span>
                      <span className="text-muted-foreground">{row.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${width}%`,
                          backgroundColor: row.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <h2 className="mt-8 mb-3 text-sm font-medium text-muted-foreground">
        CRM
      </h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {crmWidgets.map((stat) => (
          <Link key={stat.label} href={stat.href} className="group">
            <Card className="h-full shadow-none transition-colors group-hover:bg-muted/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 sm:p-6 sm:pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
                  {stat.label}
                </CardTitle>
                <stat.icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                <div className="text-xl font-semibold tracking-tight sm:text-2xl">
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-4 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Deals per fase</CardTitle>
          <CardDescription>
            Aantal leads in de standaard Sales-pipeline.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!crmStats || crmStats.dealsByStage.length === 0 ? (
            <EmptyState
              icon={Handshake}
              title="Nog geen CRM-pipeline"
              description="Maak leads aan of importeer bedrijven om de pipeline-verdeling hier te zien."
              actionLabel="Open CRM"
              actionHref="/crm/leads"
              secondaryActionLabel="Executive Dashboard"
              secondaryActionHref="/crm/executive"
            />
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {crmStats.dealsByStage.map((stage) => (
                <li
                  key={stage.stageId}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: stage.color }}
                      aria-hidden
                    />
                    {stage.stageName}
                  </span>
                  <span className="font-medium">{stage.count}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Laatste zoekopdrachten</CardTitle>
            <CardDescription>
              Recente internationale zoekcriteria voor je organisatie.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentSearches.length === 0 ? (
              <EmptyState
                icon={Search}
                title="Nog geen zoekopdrachten"
                description="Start met een internationale zoekopdracht om bedrijven en leads te verzamelen."
                actionLabel="Nieuwe zoekopdracht"
                actionHref="/zoekopdrachten"
              />
            ) : (
              <ul className="space-y-3">
                {recentSearches.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <Link
                        href={`/zoekopdrachten/${item.id}`}
                        className="font-medium hover:underline"
                      >
                        {item.name}
                      </Link>
                      <p className="truncate text-sm text-muted-foreground">
                        {formatCountryList(item.countries ?? [])}
                        {(item.keywords ?? []).length > 0
                          ? ` · ${(item.keywords ?? []).slice(0, 2).join(", ")}`
                          : ""}
                      </p>
                    </div>
                    <SearchStatusBadge status={item.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="size-4" />
              Recente scrapingtaken
            </CardTitle>
            <CardDescription>
              Pending → Active → Completed via de mock-engine.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentJobs.length === 0 ? (
              <EmptyState
                icon={ListTodo}
                title="Nog geen scrapingtaken"
                description="Start een mock scrape vanaf een zoekopdracht om jobs en resultaten te zien."
                actionLabel="Naar zoekopdrachten"
                actionHref="/zoekopdrachten"
                secondaryActionLabel="Jobs"
                secondaryActionHref="/jobs"
              />
            ) : (
              <ul className="space-y-3">
                {recentJobs.map((job) => (
                  <li
                    key={job.id}
                    className="flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <Link
                        href={`/jobs/${job.id}`}
                        className="font-medium hover:underline"
                      >
                        {job.search_queries?.name ?? "Scrape-taak"}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {job.companies_found} bedrijven · {job.pages_processed}{" "}
                        pagina&apos;s
                      </p>
                    </div>
                    <JobStatusBadge status={job.status} />
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
