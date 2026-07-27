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

export const metadata: Metadata = { title: REVENUE_UI.customersTitle };

export default async function RevenueCustomersPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  await bootstrapRevenueIntelligence(
    context.organization.id,
    context.membership.user_id,
  );
  const { kpis, growth, churn } = await getRevenueDashboard(
    context.organization.id,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={REVENUE_UI.customersTitle}
        description="Klantbasis, ARPA, LTV en retention."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Customers", value: kpis.customerCount },
          { label: "ARPA", value: `€${Math.round(kpis.arpa).toLocaleString("nl-NL")}` },
          { label: "LTV", value: `€${Math.round(kpis.ltv).toLocaleString("nl-NL")}` },
          { label: "Retention", value: `${Math.round(kpis.retentionRate * 100)}%` },
          { label: "New (30d)", value: growth.newCustomers },
          { label: "Logo churn", value: churn.logoChurn },
        ].map((r) => (
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
          <CardTitle>Unit economics</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          CAC €{Math.round(kpis.cac).toLocaleString("nl-NL")} · LTV/CAC {kpis.ltvCac} ·
          ACV €{Math.round(kpis.acv).toLocaleString("nl-NL")}
        </CardContent>
      </Card>
    </div>
  );
}
