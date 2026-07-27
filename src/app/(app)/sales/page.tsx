import type { Metadata } from "next";

import {
  SalesForecastSaveButton,
  SalesRefreshButton,
} from "@/components/sales/sales-action-buttons";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  NEXT_BEST_ACTION_LABELS,
  RISK_LEVEL_LABELS,
  SALES_UI,
  type NextBestAction,
  type RiskLevel,
} from "@/lib/sales-agent/constants";
import {
  bootstrapSalesAgent,
  getSalesDashboard,
} from "@/lib/sales-agent/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: SALES_UI.overviewTitle };

export default async function SalesOverviewPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  await bootstrapSalesAgent(
    context.organization.id,
    context.membership.user_id,
  );
  const stats = await getSalesDashboard(
    context.organization.id,
    context.membership.user_id,
  );
  const b = stats.briefing;

  const briefingItems = [
    { label: "follow-ups", value: b.followUps },
    { label: "deals met hoog risico", value: b.highRisk },
    { label: "nieuwe kansen", value: b.newOpportunities },
    { label: "klanten wachten op reactie", value: b.waitingReply },
    { label: "offerte verloopt vandaag", value: b.expiringQuotes },
  ];

  const metrics = [
    { label: "Pipeline health", value: stats.pipeline.healthScore },
    { label: "Open deals", value: stats.pipeline.openDeals },
    { label: "Win rate", value: `${Math.round(stats.pipeline.winRate * 100)}%` },
    {
      label: "Forecast month",
      value: `€${Math.round(stats.forecast.month).toLocaleString("nl-NL")}`,
    },
    {
      label: "Weighted pipeline",
      value: `€${Math.round(stats.forecast.weightedRevenue).toLocaleString("nl-NL")}`,
    },
    { label: "Analyzed deals", value: stats.analyzedDeals },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={SALES_UI.hubTitle}
        description="Persoonlijke AI Sales Manager — prioriteiten, deals, forecast en coaching, geïntegreerd met CRM."
        actions={
          <div className="flex flex-wrap gap-2">
            <SalesRefreshButton />
            <SalesForecastSaveButton />
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{b.greeting}</CardTitle>
          <CardDescription>
            Automatisch samengesteld uit open deals, taken, risico en closing dates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {briefingItems.map((item) => (
              <li key={item.label} className="flex justify-between gap-4 border-b border-border/60 py-1.5 last:border-0">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium tabular-nums">{item.value}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardHeader className="pb-2">
              <CardDescription>{m.label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{m.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s priorities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {b.priorities.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Geen open deals — of refresh de briefing na analyse.
              </p>
            ) : (
              b.priorities.slice(0, 8).map((p) => (
                <div
                  key={p.dealId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.title}</p>
                    <p className="text-muted-foreground">{p.reason}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline">{p.priorityScore}</Badge>
                    <Badge variant="secondary">
                      {RISK_LEVEL_LABELS[p.riskLevel as RiskLevel] ?? p.riskLevel}
                    </Badge>
                    <Badge variant="outline">
                      {NEXT_BEST_ACTION_LABELS[p.nextBestAction as NextBestAction] ??
                        p.nextBestAction}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pipeline & bottlenecks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              Avg cycle {stats.pipeline.avgCycleDays}d · pipeline €
              {Math.round(stats.pipeline.pipelineRevenue).toLocaleString("nl-NL")}
            </p>
            {stats.pipeline.bottlenecks.length === 0 &&
            stats.pipeline.conversionNotes.length === 0 ? (
              <p className="text-muted-foreground">Geen knelpunten gesignaleerd.</p>
            ) : (
              <ul className="list-disc space-y-1 pl-5">
                {[...stats.pipeline.bottlenecks, ...stats.pipeline.conversionNotes].map(
                  (n) => (
                    <li key={n}>{n}</li>
                  ),
                )}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
