import type { Metadata } from "next";

import { RevenueReportsButton } from "@/components/revenue/revenue-action-buttons";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  REPORT_TYPE_LABELS,
  REVENUE_UI,
  type ReportType,
} from "@/lib/revenue-intelligence/constants";
import {
  bootstrapRevenueIntelligence,
  listRevenueReports,
  listRevenueScenarios,
} from "@/lib/revenue-intelligence/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { formatDateTime } from "@/lib/ui/format";

export const metadata: Metadata = { title: REVENUE_UI.reportsTitle };

export default async function RevenueReportsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  await bootstrapRevenueIntelligence(
    context.organization.id,
    context.membership.user_id,
  );
  const [reports, scenarios] = await Promise.all([
    listRevenueReports(context.organization.id),
    listRevenueScenarios(context.organization.id),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={REVENUE_UI.reportsTitle}
        description="CEO/Board/Investor/Finance/Growth/Forecast — PDF/Excel/PPT ready."
        actions={<RevenueReportsButton />}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {reports.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nog geen reports.</p>
            ) : (
              reports.map((r) => (
                <div key={r.id} className="rounded-md border px-3 py-2 text-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <p className="font-medium">{r.title}</p>
                    <Badge variant="outline">
                      {REPORT_TYPE_LABELS[r.report_type as ReportType] ??
                        r.report_type}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.format} · {formatDateTime(r.created_at)}
                  </p>
                  <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
                    {r.body_markdown.slice(0, 600)}
                  </pre>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Scenarios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {scenarios.length === 0 ? (
              <p className="text-muted-foreground">
                Run scenarios vanaf Overview.
              </p>
            ) : (
              scenarios.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-wrap justify-between gap-2 rounded-md border px-3 py-2"
                >
                  <span>{s.name}</span>
                  <span className="text-muted-foreground">
                    ΔMRR €{Math.round(Number(s.delta_mrr)).toLocaleString("nl-NL")} ·
                    ΔARR €{Math.round(Number(s.delta_arr)).toLocaleString("nl-NL")}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
