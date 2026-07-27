import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CS_UI } from "@/lib/customer-success/constants";
import {
  bootstrapCustomerSuccess,
  listCsProfiles,
  listCustomerCompanies,
} from "@/lib/customer-success/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: CS_UI.churnTitle };

export default async function CsChurnPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  await bootstrapCustomerSuccess(
    context.organization.id,
    context.membership.user_id,
  );
  const [profiles, companies] = await Promise.all([
    listCsProfiles(context.organization.id, { minChurn: 0.25 }),
    listCustomerCompanies(context.organization.id),
  ]);
  const nameById = new Map(companies.map((c) => [c.id, c.company_name]));
  const ranked = [...profiles].sort(
    (a, b) => Number(b.churn_probability) - Number(a.churn_probability),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={CS_UI.churnTitle}
        description="Churnkans, reden, confidence en aanbevolen acties."
      />
      <Card>
        <CardHeader>
          <CardTitle>Churn risk</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {ranked.length === 0 ? (
            <p className="text-sm text-muted-foreground">Geen verhoogd churnrisico.</p>
          ) : (
            ranked.map((p) => (
              <div
                key={p.id}
                className="rounded-md border px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    {nameById.get(p.company_id) ?? p.company_id}
                  </p>
                  <Badge variant="secondary">
                    {Math.round(Number(p.churn_probability) * 100)}%
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  {p.churn_reason ?? "—"} · conf{" "}
                  {Math.round(Number(p.churn_confidence) * 100)}%
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
