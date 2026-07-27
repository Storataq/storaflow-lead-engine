import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AI_PLATFORM_UI } from "@/ai/constants";
import { listAiCosts } from "@/ai/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { formatDateTime } from "@/lib/ui/format";

export const metadata: Metadata = { title: AI_PLATFORM_UI.costsTitle };

export default async function AiCostsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  const rows = await listAiCosts(context.organization.id);
  const total = rows.reduce((sum, r) => sum + Number(r.cost_usd ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={AI_PLATFORM_UI.costsTitle}
        description="Realtime AI cost ledger by organization, provider, model, agent, and day."
      />
      <Card>
        <CardHeader>
          <CardTitle>Recent ledger</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Shown total (latest 100): ${total.toFixed(6)}
          </p>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cost entries yet.</p>
          ) : (
            rows.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {row.provider}/{row.model}
                  </p>
                  <p className="text-muted-foreground">
                    {row.day_key} · in {row.tokens_in} / out {row.tokens_out} ·{" "}
                    {formatDateTime(row.created_at)}
                  </p>
                </div>
                <p className="tabular-nums">${Number(row.cost_usd).toFixed(6)}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
