import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
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

export const metadata: Metadata = { title: REVENUE_UI.revenueTitle };

function euro(n: number) {
  return `€${Math.round(n).toLocaleString("nl-NL")}`;
}

export default async function RevenueAnalysisPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  await bootstrapRevenueIntelligence(
    context.organization.id,
    context.membership.user_id,
  );
  const { kpis: k } = await getRevenueDashboard(context.organization.id);
  const rows = [
    { label: "Gross revenue", value: euro(k.grossRevenue) },
    { label: "Net revenue", value: euro(k.netRevenue) },
    { label: "Profit", value: euro(k.profit) },
    { label: "Margin", value: `${Math.round(k.marginRate * 100)}%` },
    { label: "Avg deal value", value: euro(k.avgDealValue) },
    { label: "Avg order value", value: euro(k.avgOrderValue) },
    { label: "LTV", value: euro(k.ltv) },
    { label: "Growth", value: `${Math.round(k.growthRate * 100)}%` },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={REVENUE_UI.revenueTitle}
        description="Omzet, marge, winst, groei, AOV/ADV en lifetime value."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((r) => (
          <Card key={r.label}>
            <CardHeader className="pb-2">
              <CardDescription>{r.label}</CardDescription>
              <CardTitle className="text-xl tabular-nums">{r.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recurring</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          MRR {euro(k.mrr)} · ARR {euro(k.arr)} · Expansion {euro(k.expansionRevenue)} ·
          Contraction {euro(k.contractionRevenue)}
        </CardContent>
      </Card>
    </div>
  );
}
