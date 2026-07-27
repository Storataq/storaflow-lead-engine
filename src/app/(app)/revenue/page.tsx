import type { Metadata } from "next";

import {
  RevenueRefreshButton,
  RevenueReportsButton,
  RevenueScenarioButtons,
} from "@/components/revenue/revenue-action-buttons";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { REVENUE_UI } from "@/lib/revenue-intelligence/constants";
import {
  bootstrapRevenueIntelligence,
  getRevenueDashboard,
} from "@/lib/revenue-intelligence/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: REVENUE_UI.overviewTitle };

function euro(n: number) {
  return `€${Math.round(n).toLocaleString("nl-NL")}`;
}

export default async function RevenueOverviewPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  await bootstrapRevenueIntelligence(
    context.organization.id,
    context.membership.user_id,
  );
  const stats = await getRevenueDashboard(context.organization.id);
  const k = stats.kpis;

  const metrics = [
    { label: "MRR", value: euro(k.mrr) },
    { label: "ARR", value: euro(k.arr) },
    { label: "Growth", value: `${Math.round(k.growthRate * 100)}%` },
    { label: "NRR", value: `${Math.round(k.nrr * 100)}%` },
    { label: "Pipeline weighted", value: euro(stats.pipeline.weightedPipeline) },
    { label: "Forecast month", value: euro(stats.forecasts.find((f) => f.horizon === "month")?.forecastRevenue ?? 0) },
    { label: "Churn impact", value: euro(stats.churn.expectedChurnRevenue) },
    { label: "Confidence", value: `${Math.round(k.confidence * 100)}%` },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={REVENUE_UI.hubTitle}
        description="Realtime omzet, forecast, KPI's, churn en executive advies."
        actions={
          <div className="flex flex-wrap gap-2">
            <RevenueRefreshButton />
            <RevenueReportsButton />
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Executive summary</CardTitle>
          <CardDescription>{stats.executiveSummary}</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            <CardTitle>AI recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.recommendations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Geen aanbevelingen.</p>
            ) : (
              stats.recommendations.slice(0, 6).map((r) => (
                <div
                  key={`${r.type}-${r.title}`}
                  className="rounded-md border px-3 py-2 text-sm"
                >
                  <div className="flex justify-between gap-2">
                    <p className="font-medium">{r.title}</p>
                    <Badge variant="outline">P{r.priority}</Badge>
                  </div>
                  <p className="text-muted-foreground">{r.rationale}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Scenario simulator</CardTitle>
            <CardDescription>Toon financiële impact van aannames.</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueScenarioButtons />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
