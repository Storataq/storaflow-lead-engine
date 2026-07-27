import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CategoryActionBar } from "@/components/companies/category-action-bar";
import { CategoryIcon } from "@/components/companies/category-icon";
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
import { getCompanyCategory } from "@/lib/companies/categories/queries";
import {
  getCategoryInsights,
  getCategoryOverviewStats,
  listCategoryCompaniesDetailed,
  listCategoryRecentActivity,
} from "@/lib/companies/category-actions/queries";
import { listOrganizationMembers } from "@/lib/crm/queries";
import { listSenderProfiles } from "@/lib/email/campaign/queries";
import { listEmailSequences } from "@/lib/email/sequence/queries";
import { listEmailTemplates } from "@/lib/email/template/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

type CategoryOverviewPageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export async function generateMetadata({
  params,
}: CategoryOverviewPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Category ${id.slice(0, 8)}` };
}

export default async function CategoryOverviewPage({
  params,
}: CategoryOverviewPageProps) {
  const { id } = await params;
  const context = await getActiveOrganization();
  if (!context) notFound();

  const category = await getCompanyCategory(context.organization.id, id).catch(
    () => null,
  );
  if (!category) notFound();

  const [
    stats,
    insights,
    companies,
    activity,
    members,
    templates,
    sequences,
    senders,
  ] = await Promise.all([
    getCategoryOverviewStats(context.organization.id, id).catch(() => null),
    getCategoryInsights(context.organization.id, id).catch(() => null),
    listCategoryCompaniesDetailed(context.organization.id, id).catch(() => []),
    listCategoryRecentActivity(context.organization.id, id).catch(() => []),
    listOrganizationMembers(context.organization.id).catch(() => []),
    listEmailTemplates(context.organization.id).catch(() => []),
    listEmailSequences(context.organization.id).catch(() => []),
    listSenderProfiles(context.organization.id).catch(() => []),
  ]);

  const canAct =
    context.membership.role === "owner" ||
    context.membership.role === "admin";

  const widgets = [
    { label: "Companies", value: stats?.companies ?? 0 },
    { label: "Contacts", value: stats?.contacts ?? 0 },
    { label: "Open leads", value: stats?.qualifiedLeads ?? 0 },
    { label: "Campaign Ready", value: stats?.campaignReady ?? 0 },
    { label: "Email campaigns", value: stats?.emailCampaigns ?? 0 },
    { label: "Funnels activated", value: stats?.funnelsActivated ?? 0 },
    { label: "Open tasks", value: stats?.openTasks ?? 0 },
    {
      label: "Last activity",
      value: formatDate(stats?.lastActivityAt ?? null),
    },
  ];

  return (
    <div>
      <PageHeader
        title={category.name}
        description={
          category.description ||
          "Category overview — connect CRM, funnels, email and bulk actions."
        }
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Bedrijven", href: "/companies" },
          { label: "Categories", href: "/companies/categories" },
          { label: category.name },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/companies/categories" />}
            >
              All categories
            </Button>
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/settings/company-categories" />}
            >
              Edit taxonomy
            </Button>
          </div>
        }
      />

      <div className="mb-6 flex items-start gap-3">
        <CategoryIcon name={category.icon} color={category.color} />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={category.is_active ? "secondary" : "outline"}>
              {category.is_active ? "Active" : "Inactive"}
            </Badge>
            <span className="text-sm text-muted-foreground">{category.slug}</span>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {widgets.map((widget) => (
          <Card key={widget.label} className="shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {widget.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight">
                {widget.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Category Insights</CardTitle>
            <CardDescription>
              Snapshot metrics for this operational group.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Won deals</p>
              <p className="text-lg font-semibold">{insights?.wonDeals ?? 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Meetings (tasks)</p>
              <p className="text-lg font-semibold">{insights?.meetings ?? 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Conversion est.</p>
              <p className="text-lg font-semibold">
                {insights?.conversionEstimate != null
                  ? `${insights.conversionEstimate}%`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Open / reply rate</p>
              <p className="text-lg font-semibold text-muted-foreground">
                Pending email analytics join
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <CardDescription>
              Latest category actions, funnel runs and CRM updates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No recent activity for this category yet.
              </p>
            ) : (
              <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
                {activity.map((item) => (
                  <li
                    key={`${item.kind}-${item.id}`}
                    className="rounded-md border border-border px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium capitalize">{item.title}</span>
                      <Badge variant="outline">{item.kind}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(item.at)} · {item.description}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-4 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Category Action Bar</CardTitle>
          <CardDescription>
            Select companies, then run funnel, campaign, task, tag or AI actions.
            Campaigns always create drafts that require review before launch.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CategoryActionBar
            categoryId={category.id}
            categoryName={category.name}
            companies={companies}
            canAct={canAct}
            members={members.map((m) => ({
              userId: m.userId,
              label: m.label,
            }))}
            templates={templates.map((t) => ({ id: t.id, name: t.name }))}
            sequences={sequences.map((s) => ({ id: s.id, name: s.name }))}
            senders={senders.map((s) => ({
              id: s.id,
              name: s.name || s.sender_email || s.id,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
