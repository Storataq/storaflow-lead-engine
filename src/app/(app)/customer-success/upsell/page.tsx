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

export const metadata: Metadata = { title: CS_UI.upsellTitle };

function asItems(value: unknown): Array<{ label: string; rationale: string }> {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const row =
      item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return {
      label: String(row.label ?? row.code ?? "Opportunity"),
      rationale: String(row.rationale ?? ""),
    };
  });
}

export default async function CsUpsellPage() {
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
        title={CS_UI.upsellTitle}
        description="Upsell (seats, AI credits, enterprise, API…) en cross-sell (StorataQ suite)."
      />
      <div className="space-y-4">
        {profiles.every((p) => {
          const u = Array.isArray(p.upsell_json) ? p.upsell_json.length : 0;
          const c = Array.isArray(p.cross_sell_json) ? p.cross_sell_json.length : 0;
          return u === 0 && c === 0;
        }) ? (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              Nog geen upsell-signalen.
            </CardContent>
          </Card>
        ) : (
          profiles.flatMap((p) => {
            const upsell = asItems(p.upsell_json);
            const cross = asItems(p.cross_sell_json);
            if (upsell.length === 0 && cross.length === 0) return [];
            return [
              <Card key={p.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {nameById.get(p.company_id) ?? p.company_id}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex flex-wrap gap-1">
                    {upsell.map((u) => (
                      <Badge key={`${p.id}-u-${u.label}`} variant="outline">
                        {u.label}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {cross.map((c) => (
                      <Badge key={`${p.id}-c-${c.label}`} variant="secondary">
                        {c.label}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>,
            ];
          })
        )}
      </div>
    </div>
  );
}
