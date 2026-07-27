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
  listRevenueSnapshots,
} from "@/lib/revenue-intelligence/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { formatDateTime } from "@/lib/ui/format";

export const metadata: Metadata = { title: REVENUE_UI.arrTitle };

export default async function RevenueArrPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  await bootstrapRevenueIntelligence(
    context.organization.id,
    context.membership.user_id,
  );
  const [stats, snaps] = await Promise.all([
    getRevenueDashboard(context.organization.id),
    listRevenueSnapshots(context.organization.id, 12),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={REVENUE_UI.arrTitle} description="Annual Recurring Revenue." />
      <Card>
        <CardHeader>
          <CardDescription>Current ARR</CardDescription>
          <CardTitle className="text-3xl tabular-nums">
            €{Math.round(stats.kpis.arr).toLocaleString("nl-NL")}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          NRR {Math.round(stats.kpis.nrr * 100)}% · GRR{" "}
          {Math.round(stats.kpis.grr * 100)}%
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Snapshots</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {snaps.map((s) => (
            <div key={s.id} className="flex justify-between border-b py-1.5 last:border-0">
              <span>{formatDateTime(s.created_at)}</span>
              <span className="tabular-nums">
                €{Math.round(Number(s.arr)).toLocaleString("nl-NL")}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
