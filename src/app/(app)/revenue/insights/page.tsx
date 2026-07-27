import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  REVENUE_REC_LABELS,
  REVENUE_UI,
  type RevenueRecType,
} from "@/lib/revenue-intelligence/constants";
import {
  bootstrapRevenueIntelligence,
  listRevenueAlerts,
  listRevenueInsights,
  listRevenueRecommendations,
} from "@/lib/revenue-intelligence/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: REVENUE_UI.insightsTitle };

export default async function RevenueInsightsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  await bootstrapRevenueIntelligence(
    context.organization.id,
    context.membership.user_id,
  );
  const [insights, recs, alerts] = await Promise.all([
    listRevenueInsights(context.organization.id),
    listRevenueRecommendations(context.organization.id),
    listRevenueAlerts(context.organization.id),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={REVENUE_UI.insightsTitle}
        description="Financial insights, executive advisor en alerts."
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {insights.map((i) => (
              <div key={i.id} className="rounded-md border px-3 py-2">
                <div className="flex justify-between gap-2">
                  <p className="font-medium">{i.title}</p>
                  <Badge variant="outline">{i.severity}</Badge>
                </div>
                <p className="text-muted-foreground">{i.body}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {recs.map((r) => (
              <div key={r.id} className="rounded-md border px-3 py-2">
                <p className="font-medium">
                  {REVENUE_REC_LABELS[r.recommendation_type as RevenueRecType] ??
                    r.title}
                </p>
                <p className="text-muted-foreground">{r.rationale}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {alerts.length === 0 ? (
              <p className="text-muted-foreground">Geen open alerts.</p>
            ) : (
              alerts.map((a) => (
                <div key={a.id} className="rounded-md border px-3 py-2">
                  <div className="flex justify-between gap-2">
                    <p className="font-medium">{a.title}</p>
                    <Badge variant="secondary">{a.severity}</Badge>
                  </div>
                  <p className="text-muted-foreground">{a.message}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
