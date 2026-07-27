import type { Metadata } from "next";

import { CsApplyRecButton } from "@/components/customer-success/cs-action-buttons";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CS_RECOMMENDATION_LABELS,
  CS_UI,
  type CsRecommendationType,
} from "@/lib/customer-success/constants";
import {
  bootstrapCustomerSuccess,
  listCsAlerts,
  listCsRecommendations,
} from "@/lib/customer-success/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: CS_UI.recommendationsTitle };

export default async function CsRecommendationsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  await bootstrapCustomerSuccess(
    context.organization.id,
    context.membership.user_id,
  );
  const [recs, alerts] = await Promise.all([
    listCsRecommendations(context.organization.id),
    listCsAlerts(context.organization.id),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={CS_UI.recommendationsTitle}
        description="AI acties en alerts (geen login, lage health, contract, churn…)."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Geen open aanbevelingen.</p>
            ) : (
              recs.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{r.title}</p>
                    <p className="text-muted-foreground">{r.rationale}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="outline">
                      {CS_RECOMMENDATION_LABELS[
                        r.recommendation_type as CsRecommendationType
                      ] ?? r.recommendation_type}
                    </Badge>
                    <CsApplyRecButton recommendationId={r.id} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Geen open alerts.</p>
            ) : (
              alerts.map((a) => (
                <div
                  key={a.id}
                  className="rounded-md border px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap justify-between gap-2">
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
