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

export const metadata: Metadata = { title: REVENUE_UI.churnTitle };

export default async function RevenueChurnPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  await bootstrapRevenueIntelligence(
    context.organization.id,
    context.membership.user_id,
  );
  const { churn: c } = await getRevenueDashboard(context.organization.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={REVENUE_UI.churnTitle}
        description="Customer churn, revenue churn, impact en confidence."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            label: "Customer churn",
            value: `${Math.round(c.customerChurnRate * 100)}%`,
          },
          {
            label: "Revenue churn",
            value: `${Math.round(c.revenueChurnRate * 100)}%`,
          },
          { label: "Logo churn", value: c.logoChurn },
          {
            label: "Expected churn revenue",
            value: `€${Math.round(c.expectedChurnRevenue).toLocaleString("nl-NL")}`,
          },
          {
            label: "Confidence",
            value: `${Math.round(c.confidence * 100)}%`,
          },
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
          <CardTitle>Impact</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">{c.impact}</CardContent>
      </Card>
    </div>
  );
}
