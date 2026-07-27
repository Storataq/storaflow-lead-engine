import type { Metadata } from "next";

import { CsAnalyzeButton } from "@/components/customer-success/cs-action-buttons";
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
  CS_RECOMMENDATION_LABELS,
  CS_UI,
  type CsRecommendationType,
} from "@/lib/customer-success/constants";
import {
  bootstrapCustomerSuccess,
  getCsDashboard,
} from "@/lib/customer-success/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: CS_UI.overviewTitle };

export default async function CustomerSuccessOverviewPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  await bootstrapCustomerSuccess(
    context.organization.id,
    context.membership.user_id,
  );
  const stats = await getCsDashboard(context.organization.id);

  const metrics = [
    { label: "Customers", value: stats.customerCount },
    { label: "Avg health", value: stats.avgHealth },
    { label: "At risk", value: stats.atRiskCount },
    { label: "High churn", value: stats.highChurnCount },
    { label: "Renewals upcoming", value: stats.renewalsSoon },
    { label: "Onboarding in progress", value: stats.onboardingInProgress },
    { label: "Upsell opportunities", value: stats.upsellOpportunities },
    { label: "Open alerts", value: stats.openAlerts },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={CS_UI.hubTitle}
        description="Persoonlijke AI Customer Success Manager — health, churn, renewals, onboarding en upsell."
        actions={<CsAnalyzeButton />}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardHeader className="pb-2">
              <CardDescription>{m.label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{m.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI recommendations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {stats.recentRecommendations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nog geen aanbevelingen — run Refresh AI analysis.
            </p>
          ) : (
            stats.recentRecommendations.map((r, idx) => (
              <div
                key={`${r.type}-${idx}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{r.title}</p>
                  <p className="text-muted-foreground">{r.rationale}</p>
                </div>
                <Badge variant="outline">
                  {CS_RECOMMENDATION_LABELS[r.type as CsRecommendationType] ??
                    r.type}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
