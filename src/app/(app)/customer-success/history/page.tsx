import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CS_UI } from "@/lib/customer-success/constants";
import {
  bootstrapCustomerSuccess,
  listCsHistory,
} from "@/lib/customer-success/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { formatDateTime } from "@/lib/ui/format";

export const metadata: Metadata = { title: CS_UI.historyTitle };

export default async function CsHistoryPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  await bootstrapCustomerSuccess(
    context.organization.id,
    context.membership.user_id,
  );
  const events = await listCsHistory(context.organization.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={CS_UI.historyTitle}
        description="Analyses, renewals, CRM updates — audit trail."
      />
      <Card>
        <CardHeader>
          <CardTitle>Audit trail</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nog geen history.</p>
          ) : (
            events.map((e) => (
              <div
                key={e.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{e.summary}</p>
                  <p className="text-muted-foreground">
                    {formatDateTime(e.created_at)}
                    {e.provider ? ` · ${e.provider}/${e.model ?? "—"}` : ""}
                  </p>
                </div>
                <Badge variant="outline">{e.event_type}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
