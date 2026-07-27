import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  HEALTH_CLASS_LABELS,
  CS_UI,
  type HealthClass,
} from "@/lib/customer-success/constants";
import {
  bootstrapCustomerSuccess,
  listCsProfiles,
  listCustomerCompanies,
} from "@/lib/customer-success/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: CS_UI.healthTitle };

export default async function CsHealthPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  await bootstrapCustomerSuccess(
    context.organization.id,
    context.membership.user_id,
  );
  const [profiles, companies] = await Promise.all([
    listCsProfiles(context.organization.id),
    listCustomerCompanies(context.organization.id),
  ]);
  const nameById = new Map(companies.map((c) => [c.id, c.company_name]));

  return (
    <div className="space-y-6">
      <PageHeader
        title={CS_UI.healthTitle}
        description="Customer Health Score 0–100 met classificatie Excellent → Critical / At Risk."
      />
      <Card>
        <CardHeader>
          <CardTitle>Health scores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {profiles.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nog geen scores.</p>
          ) : (
            profiles.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {nameById.get(p.company_id) ?? p.company_id}
                  </p>
                  <p className="text-muted-foreground">
                    Adoption {p.adoption_score} · Engagement {p.engagement_score} ·
                    conf {Math.round(Number(p.ai_confidence) * 100)}%
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline">{p.health_score}</Badge>
                  <Badge variant="secondary">
                    {HEALTH_CLASS_LABELS[p.health_class as HealthClass] ??
                      p.health_class}
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
