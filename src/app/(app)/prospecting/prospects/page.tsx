import type { Metadata } from "next";

import { ProspectsManager } from "@/components/prospecting/prospects-manager";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PROSPECTING_UI } from "@/lib/prospecting/constants";
import { listProspects } from "@/lib/prospecting/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: PROSPECTING_UI.prospectsTitle };

export default async function ProspectingProspectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await getActiveOrganization();
  if (!context) return null;
  const sp = await searchParams;
  const minScore = sp.minScore ? Number(sp.minScore) : undefined;
  const country = typeof sp.country === "string" ? sp.country : undefined;
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const q = typeof sp.q === "string" ? sp.q : undefined;

  const prospects = await listProspects(context.organization.id, {
    minScore: Number.isFinite(minScore) ? minScore : undefined,
    country,
    status,
    q,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={PROSPECTING_UI.prospectsTitle}
        description="Filter, research, enrich, export, and push prospects to CRM."
      />
      <Card>
        <CardHeader>
          <CardTitle>Prospect list</CardTitle>
        </CardHeader>
        <CardContent>
          <ProspectsManager prospects={prospects} />
        </CardContent>
      </Card>
    </div>
  );
}
