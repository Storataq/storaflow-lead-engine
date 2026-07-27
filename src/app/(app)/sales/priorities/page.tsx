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

export const metadata: Metadata = { title: SALES_UI.prioritiesTitle };

export default async function SalesPrioritiesPage() {
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
        title={SALES_UI.prioritiesTitle}
        description="Prioriteit op basis van waarde, closing date, lead score, stilte, taken, risico en business impact."
      />
      <Card>
        <CardHeader>
          <CardTitle>Ranked actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {stats.briefing.priorities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No priorities yet.</p>
          ) : (
            stats.briefing.priorities.map((p, idx) => (
              <div
                key={p.dealId}
                className="flex flex-wrap items-start justify-between gap-3 rounded-md border px-3 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    #{idx + 1} {p.title}
                  </p>
                  <p className="text-muted-foreground">{p.reason}</p>
                  <p className="mt-1 text-muted-foreground">
                    €{Number(p.value).toLocaleString("nl-NL")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline">P{p.priorityScore}</Badge>
                  <Badge variant="secondary">
                    {RISK_LEVEL_LABELS[p.riskLevel as RiskLevel] ?? p.riskLevel}
                  </Badge>
                  <Badge>
                    {NEXT_BEST_ACTION_LABELS[p.nextBestAction as NextBestAction] ??
                      p.nextBestAction}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
