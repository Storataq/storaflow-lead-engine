import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PROSPECTING_UI } from "@/lib/prospecting/constants";
import { listProspects } from "@/lib/prospecting/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: PROSPECTING_UI.opportunitiesTitle };

export default async function ProspectingOpportunitiesPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  const prospects = await listProspects(context.organization.id, {
    minScore: 50,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={PROSPECTING_UI.opportunitiesTitle}
        description="Detected gaps and growth signals per prospect."
      />
      <Card>
        <CardHeader>
          <CardTitle>Top opportunities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {prospects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No opportunities yet.</p>
          ) : (
            prospects.map((p) => {
              const ops = Array.isArray(p.opportunities_json)
                ? p.opportunities_json
                : [];
              return (
                <div key={p.id} className="rounded-md border px-3 py-2 text-sm">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="font-medium">{p.company_name}</p>
                    <Badge variant="outline">{p.lead_score}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {ops.length === 0 ? (
                      <span className="text-muted-foreground">No signals</span>
                    ) : (
                      ops.map((op, idx) => {
                        if (!op || typeof op !== "object") return null;
                        const label =
                          "label" in op ? String((op as { label?: string }).label) : "op";
                        const severity =
                          "severity" in op
                            ? String((op as { severity?: string }).severity)
                            : "low";
                        return (
                          <Badge
                            key={`${p.id}-${idx}`}
                            variant={severity === "high" ? "default" : "secondary"}
                          >
                            {label}
                          </Badge>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
