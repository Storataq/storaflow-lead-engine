import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  EMAIL_TEMPLATE_LABELS,
  SALES_UI,
  type EmailTemplateType,
} from "@/lib/sales-agent/constants";
import {
  bootstrapSalesAgent,
  listEmailDrafts,
} from "@/lib/sales-agent/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/ui/format";

export const metadata: Metadata = { title: SALES_UI.activitiesTitle };

export default async function SalesActivitiesPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  await bootstrapSalesAgent(
    context.organization.id,
    context.membership.user_id,
  );

  const supabase = await createClient();
  const [{ data: tasks }, drafts] = await Promise.all([
    supabase
      .from("crm_tasks")
      .select("id, title, status, priority, due_at, deal_id, created_at")
      .eq("organization_id", context.organization.id)
      .in("status", ["todo", "in_progress"])
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(40),
    listEmailDrafts(context.organization.id),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={SALES_UI.activitiesTitle}
        description="Open CRM tasks (AI follow-ups) and generated email drafts."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Open tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(tasks ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No open tasks.</p>
            ) : (
              (tasks ?? []).map((t) => (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{t.title}</p>
                    <p className="text-muted-foreground">
                      Due {t.due_at ? formatDateTime(t.due_at) : "—"}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Badge variant="outline">{t.status}</Badge>
                    <Badge variant="secondary">{t.priority}</Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Email drafts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {drafts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No drafts — generate from Deals.
              </p>
            ) : (
              drafts.map((d) => (
                <div
                  key={d.id}
                  className="rounded-md border px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{d.subject}</p>
                    <Badge variant="outline">
                      {EMAIL_TEMPLATE_LABELS[d.template_type as EmailTemplateType] ??
                        d.template_type}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-muted-foreground">
                    {d.body_text}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(d.created_at)} · {d.status}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
