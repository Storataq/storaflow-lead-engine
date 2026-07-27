import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PROSPECTING_UI } from "@/lib/prospecting/constants";
import { listProspects } from "@/lib/prospecting/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: PROSPECTING_UI.enrichmentTitle };

export default async function ProspectingEnrichmentPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  const prospects = (await listProspects(context.organization.id, {}, 100)).filter(
    (p) => p.status === "enriched" || p.status === "crm_linked",
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={PROSPECTING_UI.enrichmentTitle}
        description="Description, contacts, social, technologies, and CRM company fields."
      />
      <Card>
        <CardHeader>
          <CardTitle>Enriched prospects</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {prospects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No enriched prospects yet.</p>
          ) : (
            prospects.map((p) => (
              <div key={p.id} className="rounded-md border px-3 py-2 text-sm">
                <p className="font-medium">{p.company_name}</p>
                <p className="text-muted-foreground">
                  {p.email ?? "—"} · {p.phone ?? "—"} ·{" "}
                  {Array.isArray(p.technologies_json)
                    ? p.technologies_json.filter((t) => typeof t === "string").join(", ")
                    : "—"}
                </p>
                <p className="mt-1">{p.description?.slice(0, 240) ?? "—"}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
