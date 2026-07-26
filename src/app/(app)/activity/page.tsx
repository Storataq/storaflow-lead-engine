import type { Metadata } from "next";
import Link from "next/link";
import { Activity } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = {
  title: "Activiteiten",
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function ActivityPage() {
  const context = await getActiveOrganization();
  const events = context
    ? await (async () => {
        const supabase = await createClient();
        const { data } = await supabase
          .from("activity_events")
          .select("*")
          .eq("organization_id", context.organization.id)
          .order("created_at", { ascending: false })
          .limit(100);
        return data ?? [];
      })().catch(() => [])
    : [];

  return (
    <div>
      <PageHeader
        title="Activiteiten"
        description="Auditlog van acties binnen je organisatie, inclusief CRM-gebeurtenissen."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Activiteiten" },
        ]}
      />
      {events.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="Nog geen activiteiten"
          description="Gebeurtenissen zoals lead-aanmaak, stage-wijzigingen en taken verschijnen hier."
          actionLabel="Naar CRM"
          actionHref="/crm/leads"
        />
      ) : (
        <ul className="space-y-3">
          {events.map((event) => (
            <li
              key={event.id}
              className="rounded-xl border border-border px-4 py-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant="secondary">{event.event_type}</Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDate(event.created_at)}
                </span>
              </div>
              <p className="mt-2 text-muted-foreground">{event.description}</p>
              {event.entity_type === "crm_lead" && event.entity_id ? (
                <Link
                  href={`/crm/leads/${event.entity_id}`}
                  className="mt-2 inline-block text-xs font-medium underline-offset-4 hover:underline"
                >
                  Bekijk lead
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
