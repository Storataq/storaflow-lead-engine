import type { Metadata } from "next";

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
} from "@/lib/sales-agent/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: SALES_UI.pipelineTitle };

export default async function SalesPipelinePage() {
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
  const p = stats.pipeline;

  const metrics = [
    { label: "Health score", value: p.healthScore },
    { label: "Open", value: p.openDeals },
    { label: "Won", value: p.wonDeals },
    { label: "Lost", value: p.lostDeals },
    { label: "Win rate", value: `${Math.round(p.winRate * 100)}%` },
    { label: "Avg cycle (days)", value: p.avgCycleDays },
    {
      label: "Pipeline €",
      value: Math.round(p.pipelineRevenue).toLocaleString("nl-NL"),
    },
    {
      label: "Weighted €",
      value: Math.round(p.weightedRevenue).toLocaleString("nl-NL"),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={SALES_UI.pipelineTitle}
        description="Pipeline health, bottlenecks, doorlooptijd, conversie en omzetverwachting."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardHeader className="pb-2">
              <CardDescription>{m.label}</CardDescription>
              <CardTitle className="text-xl tabular-nums">{m.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Bottlenecks</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {p.bottlenecks.length === 0 ? (
              <p className="text-muted-foreground">None detected.</p>
            ) : (
              <ul className="list-disc space-y-1 pl-5">
                {p.bottlenecks.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Conversion notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {p.conversionNotes.length === 0 ? (
              <p className="text-muted-foreground">No conversion alerts.</p>
            ) : (
              <ul className="list-disc space-y-1 pl-5">
                {p.conversionNotes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
