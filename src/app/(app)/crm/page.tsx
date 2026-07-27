import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  Handshake,
  Percent,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";

import { CrmSubnav } from "@/components/crm/crm-subnav";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { ReloadErrorAlert } from "@/components/layout/reload-error-alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDealValue } from "@/lib/crm/constants";
import {
  getCrmDashboardStats,
  getPipelineAnalytics,
} from "@/lib/crm/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

export const metadata: Metadata = {
  title: "CRM Dashboard",
};

export default async function CrmDashboardPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  let errorMessage: string | null = null;
  let stats = null;
  let forecast = null;

  try {
    [stats, forecast] = await Promise.all([
      getCrmDashboardStats(context.organization.id),
      getPipelineAnalytics(context.organization.id).catch(() => null),
    ]);
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Kon CRM-dashboard niet laden. Controleer of migratie 000008 is uitgevoerd.",
    );
  }

  const widgets = [
    {
      label: "Nieuwe leads",
      value: String(stats?.newLeadsCount ?? 0),
      hint: "Laatste 7 dagen",
      icon: Users,
      href: "/crm/leads",
    },
    {
      label: "Open deals",
      value: String(stats?.openDealsCount ?? 0),
      hint: "Actieve deals",
      icon: Handshake,
      href: "/crm/deals",
    },
    {
      label: "Pipeline waarde",
      value: formatDealValue(
        forecast?.pipelineValue ?? stats?.pipelineValue ?? 0,
      ),
      hint: "Open deal value",
      icon: TrendingUp,
      href: "/crm/pipeline?view=deals",
    },
    {
      label: "Weighted revenue",
      value: formatDealValue(forecast?.weightedRevenue ?? 0),
      hint: "Probability × value",
      icon: TrendingUp,
      href: "/crm/analytics",
    },
    {
      label: "Deals gewonnen",
      value: String(stats?.wonDealsCount ?? 0),
      hint: "Totaal gewonnen",
      icon: Trophy,
      href: "/crm/deals",
    },
    {
      label: "Taken vandaag",
      value: String(stats?.tasksDueToday ?? 0),
      hint: "Deadline vandaag",
      icon: CheckCircle2,
      href: "/crm/tasks",
    },
    {
      label: "Conversieratio",
      value: `${forecast?.winRate ?? stats?.conversionRate ?? 0}%`,
      hint: "Win rate",
      icon: Percent,
      href: "/crm/analytics",
    },
    {
      label: "Leads deze maand",
      value: String(stats?.leadsThisMonth ?? 0),
      hint: "Huidige maand",
      icon: Users,
      href: "/crm/leads",
    },
    {
      label: "Gem. dealwaarde",
      value: formatDealValue(
        forecast?.averageDealSize ?? stats?.averageDealValue ?? 0,
      ),
      hint: "Open deals",
      icon: Handshake,
      href: "/crm/deals",
    },
    {
      label: "Monthly forecast",
      value: formatDealValue(forecast?.monthlyForecast ?? 0),
      hint: "Weighted close dates",
      icon: TrendingUp,
      href: "/crm/analytics",
    },
  ] as const;

  return (
    <div>
      <PageHeader
        title="CRM Dashboard"
        description="Overzicht van leads, deals, pipelinewaarde en taken."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "CRM" },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/crm/pipeline?view=deals" />}
            >
              Deal board
            </Button>
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/crm/analytics" />}
            >
              Analytics
            </Button>
            <Button nativeButton={false} render={<Link href="/crm/leads" />}>
              Naar leads
            </Button>
          </div>
        }
      />
      <CrmSubnav currentPath="/crm" />

      {errorMessage ? (
        <ReloadErrorAlert
          title="CRM-dashboard niet beschikbaar"
          description={errorMessage}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {widgets.map((widget) => (
              <Link key={widget.label} href={widget.href} className="group">
                <Card className="h-full shadow-none transition-colors group-hover:bg-muted/30">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {widget.label}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {widget.hint}
                      </CardDescription>
                    </div>
                    <widget.icon className="size-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold tracking-tight">
                      {widget.value}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <Card className="mt-6 shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Deals per fase</CardTitle>
              <CardDescription>
                Verdeling van leads over de standaard pipeline.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!stats || stats.dealsByStage.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="Nog geen pipeline-data"
                  description="Voeg leads toe of verplaats bedrijven naar de CRM-pipeline om fases hier te zien."
                  actionLabel="Maak een lead"
                  actionHref="/crm/leads"
                  secondaryActionLabel="Pipeline"
                  secondaryActionHref="/crm/pipeline"
                />
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {stats.dealsByStage.map((stage) => (
                    <li
                      key={stage.stageId}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: stage.color }}
                          aria-hidden
                        />
                        <span className="truncate">{stage.stageName}</span>
                      </span>
                      <span className="font-medium">{stage.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
