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

export const metadata: Metadata = { title: REVENUE_UI.mrrTitle };

export default async function RevenueMrrPage() {
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
      <PageHeader title={REVENUE_UI.mrrTitle} description="Monthly Recurring Revenue." />
      <Card>
        <CardHeader>
          <CardDescription>Current MRR</CardDescription>
          <CardTitle className="text-3xl tabular-nums">
            €{Math.round(stats.kpis.mrr).toLocaleString("nl-NL")}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Growth {Math.round(stats.kpis.growthRate * 100)}% · ARPA €
          {Math.round(stats.kpis.arpa).toLocaleString("nl-NL")}
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
                €{Math.round(Number(s.mrr)).toLocaleString("nl-NL")}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
