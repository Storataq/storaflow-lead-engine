import type { Metadata } from "next";

import { CsRenewalTasksButton } from "@/components/customer-success/cs-action-buttons";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CS_UI } from "@/lib/customer-success/constants";
import {
  bootstrapCustomerSuccess,
  listCsRenewals,
  listCustomerCompanies,
} from "@/lib/customer-success/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: CS_UI.renewalsTitle };

export default async function CsRenewalsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  await bootstrapCustomerSuccess(
    context.organization.id,
    context.membership.user_id,
  );
  const [renewals, companies] = await Promise.all([
    listCsRenewals(context.organization.id),
    listCustomerCompanies(context.organization.id),
  ]);
  const nameById = new Map(companies.map((c) => [c.id, c.company_name]));

  return (
    <div className="space-y-6">
      <PageHeader
        title={CS_UI.renewalsTitle}
        description="Contracteinddata, renewal kans, risico en taken."
      />
      <Card>
        <CardHeader>
          <CardTitle>Upcoming renewals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {renewals.length === 0 ? (
            <p className="text-sm text-muted-foreground">Geen renewals.</p>
          ) : (
            renewals.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {nameById.get(r.company_id) ?? r.company_id}
                  </p>
                  <p className="text-muted-foreground">
                    Ends {r.contract_ends_at} · win chance{" "}
                    {Math.round(Number(r.renewal_probability) * 100)}%
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{r.risk_level}</Badge>
                  <Badge variant="outline">{r.status}</Badge>
                  <CsRenewalTasksButton companyId={r.company_id} />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
