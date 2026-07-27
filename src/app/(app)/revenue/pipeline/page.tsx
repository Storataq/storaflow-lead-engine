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

export const metadata: Metadata = { title: REVENUE_UI.pipelineTitle };

export default async function RevenuePipelinePage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  await bootstrapRevenueIntelligence(
    context.organization.id,
    context.membership.user_id,
  );
  const { pipeline: p } = await getRevenueDashboard(context.organization.id);
  const rows = [
    { label: "Open pipeline", value: p.openPipeline },
    { label: "Weighted", value: p.weightedPipeline },
    { label: "Likely revenue", value: p.likelyRevenue },
    { label: "Risk revenue", value: p.riskRevenue },
    { label: "Missed revenue", value: p.missedRevenue },
    { label: "Expected closings", value: p.expectedClosings },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={REVENUE_UI.pipelineTitle}
        description="Open, gewogen, waarschijnlijke en risicovolle omzet."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => (
          <Card key={r.label}>
            <CardHeader className="pb-2">
              <CardDescription>{r.label}</CardDescription>
              <CardTitle className="text-xl tabular-nums">
                {typeof r.value === "number" && r.label !== "Expected closings"
                  ? `€${Math.round(r.value).toLocaleString("nl-NL")}`
                  : r.value}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
