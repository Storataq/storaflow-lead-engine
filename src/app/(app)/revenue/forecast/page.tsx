import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FORECAST_HORIZON_LABELS,
  REVENUE_UI,
  type ForecastHorizon,
} from "@/lib/revenue-intelligence/constants";
import {
  bootstrapRevenueIntelligence,
  getRevenueDashboard,
} from "@/lib/revenue-intelligence/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: REVENUE_UI.forecastTitle };

export default async function RevenueForecastPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  await bootstrapRevenueIntelligence(
    context.organization.id,
    context.membership.user_id,
  );
  const stats = await getRevenueDashboard(context.organization.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={REVENUE_UI.forecastTitle}
        description="Week → vijf jaar met forecast confidence."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.forecasts.map((f) => (
          <Card key={f.horizon}>
            <CardHeader className="pb-2">
              <CardDescription>
                {FORECAST_HORIZON_LABELS[f.horizon as ForecastHorizon] ?? f.horizon}
              </CardDescription>
              <CardTitle className="text-xl tabular-nums">
                €{Math.round(f.forecastRevenue).toLocaleString("nl-NL")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline">
                conf {Math.round(f.confidence * 100)}%
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
