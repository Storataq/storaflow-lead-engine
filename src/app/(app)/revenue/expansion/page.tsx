import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { REVENUE_UI } from "@/lib/revenue-intelligence/constants";
import {
  bootstrapRevenueIntelligence,
  getRevenueDashboard,
} from "@/lib/revenue-intelligence/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: REVENUE_UI.expansionTitle };

export default async function RevenueExpansionPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  await bootstrapRevenueIntelligence(
    context.organization.id,
    context.membership.user_id,
  );
  const { expansion } = await getRevenueDashboard(context.organization.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={REVENUE_UI.expansionTitle}
        description="Upsell, cross-sell, enterprise, modules, landen."
      />
      <Card>
        <CardHeader>
          <CardTitle>Opportunities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {expansion.length === 0 ? (
            <p className="text-sm text-muted-foreground">Geen expansion signalen.</p>
          ) : (
            expansion.map((e) => (
              <div
                key={e.code}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{e.label}</p>
                  <p className="text-muted-foreground">{e.rationale}</p>
                </div>
                <Badge variant="outline">
                  €{Math.round(e.potentialRevenue).toLocaleString("nl-NL")}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
