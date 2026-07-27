import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PROSPECTING_UI } from "@/lib/prospecting/constants";
import { listLinkedCompanies } from "@/lib/prospecting/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: PROSPECTING_UI.companiesTitle };

export default async function ProspectingCompaniesPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  const rows = await listLinkedCompanies(context.organization.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={PROSPECTING_UI.companiesTitle}
        description="Prospects linked to CRM companies after enrichment or push."
      />
      <Card>
        <CardHeader>
          <CardTitle>Linked companies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No linked companies yet.</p>
          ) : (
            rows.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{p.company_name}</p>
                  <p className="text-muted-foreground">
                    company_id {p.company_id} · score {p.lead_score}
                  </p>
                </div>
                <Badge variant="outline">{p.business_class ?? "—"}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
