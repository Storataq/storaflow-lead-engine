import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  NEXT_BEST_ACTION_LABELS,
  RISK_LEVEL_LABELS,
  SALES_OPPORTUNITY_LABELS,
  SALES_UI,
  type NextBestAction,
  type RiskLevel,
  type SalesOpportunityCode,
} from "@/lib/sales-agent/constants";
import {
  bootstrapSalesAgent,
  listDealInsights,
  listOpenDealsForSales,
} from "@/lib/sales-agent/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { formatDateTime } from "@/lib/ui/format";

export const metadata: Metadata = { title: SALES_UI.insightsTitle };

function asStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

export default async function SalesInsightsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  await bootstrapSalesAgent(
    context.organization.id,
    context.membership.user_id,
  );

  const [insights, deals] = await Promise.all([
    listDealInsights(context.organization.id, {}, 50),
    listOpenDealsForSales(context.organization.id),
  ]);
  const titleById = new Map(deals.map((d) => [d.id, d.title]));

  return (
    <div className="space-y-6">
      <PageHeader
        title={SALES_UI.insightsTitle}
        description="Closing probability, expected revenue, risk, obstacles, missed activities, coach tips."
      />
      <Card>
        <CardHeader>
          <CardTitle>Deal insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {insights.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Run Analyze on deals first.
            </p>
          ) : (
            insights.map((i) => {
              const tips = asStringList(i.coach_tips_json);
              const obstacles = asStringList(i.obstacles_json);
              const ops = Array.isArray(i.opportunities_json)
                ? i.opportunities_json
                : [];
              return (
                <div
                  key={i.id}
                  className="space-y-2 rounded-md border px-3 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">
                      {titleById.get(i.deal_id) ?? i.deal_id}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline">P{i.priority_score}</Badge>
                      <Badge variant="secondary">
                        {RISK_LEVEL_LABELS[i.risk_level as RiskLevel] ??
                          i.risk_level}
                      </Badge>
                      <Badge variant="outline">
                        Win {Math.round(Number(i.closing_probability) * 100)}%
                      </Badge>
                      <Badge>
                        {NEXT_BEST_ACTION_LABELS[
                          i.next_best_action as NextBestAction
                        ] ?? i.next_best_action}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-muted-foreground">
                    Expected €
                    {Number(i.expected_revenue).toLocaleString("nl-NL")} ·
                    predicted close {i.predicted_close_date ?? "—"} · conf{" "}
                    {Math.round(Number(i.ai_confidence) * 100)}% ·{" "}
                    {formatDateTime(i.analyzed_at)}
                  </p>
                  {tips[0] ? <p>{tips[0]}</p> : null}
                  {obstacles.length > 0 ? (
                    <p className="text-muted-foreground">
                      Obstacles: {obstacles.join(" · ")}
                    </p>
                  ) : null}
                  {ops.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {ops.map((op, idx) => {
                        const code =
                          op &&
                          typeof op === "object" &&
                          "code" in op &&
                          typeof (op as { code: unknown }).code === "string"
                            ? ((op as { code: string }).code as SalesOpportunityCode)
                            : null;
                        return (
                          <Badge key={`${i.id}-op-${idx}`} variant="outline">
                            {code
                              ? SALES_OPPORTUNITY_LABELS[code] ?? code
                              : "Opportunity"}
                          </Badge>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
