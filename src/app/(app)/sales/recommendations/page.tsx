import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  NEXT_BEST_ACTION_LABELS,
  RISK_LEVEL_LABELS,
  SALES_UI,
  type NextBestAction,
  type RiskLevel,
} from "@/lib/sales-agent/constants";
import {
  bootstrapSalesAgent,
  getSalesDashboard,
} from "@/lib/sales-agent/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: SALES_UI.recommendationsTitle };

export default async function SalesRecommendationsPage() {
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={SALES_UI.recommendationsTitle}
        description="AI Coach — next best actions, risk coaching, and follow-up recommendations."
      />
      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {stats.recentRecommendations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No recommendations — open deals required.
            </p>
          ) : (
            stats.recentRecommendations.map((r) => (
              <div
                key={r.dealId}
                className="rounded-md border px-3 py-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{r.title}</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline">P{r.priorityScore}</Badge>
                    <Badge variant="secondary">
                      {RISK_LEVEL_LABELS[r.riskLevel as RiskLevel] ??
                        r.riskLevel}
                    </Badge>
                    <Badge>
                      {NEXT_BEST_ACTION_LABELS[
                        r.nextBestAction as NextBestAction
                      ] ?? r.nextBestAction}
                    </Badge>
                  </div>
                </div>
                <p className="mt-1 text-muted-foreground">{r.reason}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
