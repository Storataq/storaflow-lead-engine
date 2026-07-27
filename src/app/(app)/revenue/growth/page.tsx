import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
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

export const metadata: Metadata = { title: REVENUE_UI.growthTitle };

export default async function RevenueGrowthPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  await bootstrapRevenueIntelligence(
    context.organization.id,
    context.membership.user_id,
  );
  const { growth: g } = await getRevenueDashboard(context.organization.id);
  const rows = [
    { label: "New customers", value: g.newCustomers },
    { label: "New revenue", value: `€${Math.round(g.newRevenue).toLocaleString("nl-NL")}` },
    { label: "Recurring", value: `€${Math.round(g.recurringRevenue).toLocaleString("nl-NL")}` },
    { label: "Upsell pipeline", value: `€${Math.round(g.upsellRevenue).toLocaleString("nl-NL")}` },
    { label: "Cross-sell pipeline", value: `€${Math.round(g.crossSellRevenue).toLocaleString("nl-NL")}` },
    { label: "Renewals tracked", value: g.renewals },
    { label: "Growth rate", value: `${Math.round(g.growthRate * 100)}%` },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={REVENUE_UI.growthTitle}
        description="Nieuwe klanten, recurring, upsell/cross-sell en renewals."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => (
          <Card key={r.label}>
            <CardHeader className="pb-2">
              <CardDescription>{r.label}</CardDescription>
              <CardTitle className="text-xl tabular-nums">{r.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
