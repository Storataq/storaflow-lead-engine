import type { Metadata } from "next";

import { SalesForecastSaveButton } from "@/components/sales/sales-action-buttons";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SALES_UI } from "@/lib/sales-agent/constants";
import {
  bootstrapSalesAgent,
  getSalesDashboard,
  listForecastSnapshots,
} from "@/lib/sales-agent/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { formatDateTime } from "@/lib/ui/format";

export const metadata: Metadata = { title: SALES_UI.forecastTitle };

export default async function SalesForecastPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  await bootstrapSalesAgent(
    context.organization.id,
    context.membership.user_id,
  );
  const [stats, snapshots] = await Promise.all([
    getSalesDashboard(context.organization.id, context.membership.user_id),
    listForecastSnapshots(context.organization.id),
  ]);
  const f = stats.forecast;

  const metrics: Array<{ label: string; value: string; money?: boolean }> = [
    {
      label: "Month",
      value: Math.round(f.month).toLocaleString("nl-NL"),
      money: true,
    },
    {
      label: "Quarter",
      value: Math.round(f.quarter).toLocaleString("nl-NL"),
      money: true,
    },
    {
      label: "Year",
      value: Math.round(f.year).toLocaleString("nl-NL"),
      money: true,
    },
    {
      label: "Pipeline",
      value: Math.round(f.pipelineRevenue).toLocaleString("nl-NL"),
      money: true,
    },
    {
      label: "Weighted",
      value: Math.round(f.weightedRevenue).toLocaleString("nl-NL"),
      money: true,
    },
    {
      label: "Confidence",
      value: `${Math.round(f.confidence * 100)}%`,
    },
    {
      label: "Target hit chance",
      value:
        f.targetHitProbability == null
          ? "—"
          : `${Math.round(f.targetHitProbability * 100)}%`,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={SALES_UI.forecastTitle}
        description="Omzet maand/kwartaal/jaar, target kans en forecast confidence."
        actions={<SalesForecastSaveButton />}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardHeader className="pb-2">
              <CardDescription>{m.label}</CardDescription>
              <CardTitle className="text-xl tabular-nums">
                {m.money ? `€${m.value}` : m.value}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Saved snapshots</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {snapshots.length === 0 ? (
            <p className="text-muted-foreground">No snapshots yet.</p>
          ) : (
            snapshots.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap justify-between gap-2 rounded-md border px-3 py-2"
              >
                <span>
                  {s.period_type} {s.period_key} · €
                  {Number(s.forecast_revenue).toLocaleString("nl-NL")}
                </span>
                <span className="text-muted-foreground">
                  conf {Math.round(Number(s.confidence) * 100)}% ·{" "}
                  {formatDateTime(s.created_at)}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
