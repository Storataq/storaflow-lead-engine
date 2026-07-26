import type { Metadata } from "next";
import {
  Activity,
  Building2,
  CheckCircle2,
  ListTodo,
  Mail,
  Search,
  XCircle,
} from "lucide-react";
import Link from "next/link";

import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { SearchStatusBadge } from "@/components/searches/search-status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCountryList } from "@/lib/international/display";
import { listScrapeJobs } from "@/lib/jobs/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { listSearchQueries } from "@/lib/searches/queries";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const context = await getActiveOrganization();
  const searches = context
    ? await listSearchQueries({
        organizationId: context.organization.id,
        sort: "newest",
      }).catch(() => [])
    : [];
  const jobs = context
    ? await listScrapeJobs({
        organizationId: context.organization.id,
        sort: "newest",
      }).catch(() => [])
    : [];
  const recentSearches = searches.slice(0, 5);
  const recentJobs = jobs.slice(0, 5);
  const activeSearchCount = searches.filter(
    (item) => item.status === "active",
  ).length;
  const activeJobs = jobs.filter(
    (item) => item.status === "queued" || item.status === "running",
  ).length;
  const failedJobs = jobs.filter((item) => item.status === "failed").length;

  const stats = [
    { label: "Bedrijven", value: "—", icon: Building2 },
    { label: "Contactgegevens", value: "—", icon: Mail },
    {
      label: "Zoekopdrachten",
      value: String(searches.length),
      icon: Search,
    },
    {
      label: "Actieve zoekopdrachten",
      value: String(activeSearchCount),
      icon: CheckCircle2,
    },
    {
      label: "Actieve taken",
      value: String(activeJobs),
      icon: ListTodo,
    },
    {
      label: "Mislukte taken",
      value: String(failedJobs),
      icon: XCircle,
    },
  ] as const;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overzicht van je lead database, scrapingtaken en recente activiteit."
        breadcrumbs={[{ label: "Dashboard" }]}
        actions={
          <Button nativeButton={false} render={<Link href="/zoekopdrachten" />}>
            <Search className="size-4" />
            Nieuwe zoekopdracht
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tracking-tight">
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
              <p className="text-sm text-muted-foreground">
                Nog geen zoekopdrachten.{" "}
                <Link
                  href="/zoekopdrachten"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Maak er een aan
                </Link>
                .
              </p>
            ) : (
              <ul className="space-y-3">
                {recentSearches.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-3">
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
              <p className="text-sm text-muted-foreground">
                Nog geen scrapingtaken.{" "}
                <Link
                  href="/zoekopdrachten"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Start vanaf een zoekopdracht
                </Link>
                .
              </p>
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
