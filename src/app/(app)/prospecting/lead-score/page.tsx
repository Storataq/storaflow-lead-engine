import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LEAD_QUALITY_LABELS,
  PROSPECTING_UI,
  type LeadQuality,
} from "@/lib/prospecting/constants";
import { listProspects } from "@/lib/prospecting/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: PROSPECTING_UI.leadScoreTitle };

export default async function ProspectingLeadScorePage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  const prospects = await listProspects(context.organization.id, {}, 100);

  return (
    <div className="space-y-6">
      <PageHeader
        title={PROSPECTING_UI.leadScoreTitle}
        description="0–100 score from size, industry, digital maturity, Storaflow fit, and opportunities."
      />
      <Card>
        <CardHeader>
          <CardTitle>Scored prospects</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {prospects.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">{p.company_name}</p>
                <p className="text-muted-foreground">
                  confidence {Number(p.ai_confidence).toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{p.lead_score}</Badge>
                <Badge variant="secondary">
                  {LEAD_QUALITY_LABELS[p.lead_quality as LeadQuality] ??
                    p.lead_quality}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
