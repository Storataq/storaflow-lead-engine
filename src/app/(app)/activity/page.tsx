import type { Metadata } from "next";
import Link from "next/link";
import { Activity } from "lucide-react";

import { CollaborationSubnav } from "@/components/collaboration/collaboration-subnav";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { COLLAB_UI } from "@/lib/collaboration/constants";
import { getUnifiedActivityFeed } from "@/lib/collaboration/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { formatDateTime, formatStatusLabel } from "@/lib/ui/format";

export const metadata: Metadata = {
  title: COLLAB_UI.activityTitle,
};

export default async function ActivityPage() {
  const context = await getActiveOrganization();
  const events = context
    ? await getUnifiedActivityFeed(context.organization.id, 100)
    : [];

  return (
    <div>
      <PageHeader
        title={COLLAB_UI.activityTitle}
        description="Unified feed: CRM actions, comments, mentions, uploads, and collaboration audit events."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: COLLAB_UI.hubTitle, href: "/collaboration" },
          { label: COLLAB_UI.activityTitle },
        ]}
      />
      <CollaborationSubnav />
      {events.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="Nog geen activiteiten"
          description="Gebeurtenissen zoals lead-aanmaak, comments, mentions en uploads verschijnen hier."
          actionLabel="Naar Collaboration"
          actionHref="/collaboration"
          secondaryActionLabel="Naar CRM"
          secondaryActionHref="/crm/leads"
        />
      ) : (
        <ul className="space-y-3">
          {events.map((event) => (
            <li
              key={event.id}
              className="rounded-xl border border-border px-4 py-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {formatStatusLabel(event.eventType)}
                  </Badge>
                  <Badge variant="outline">{event.source}</Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(event.createdAt)}
                </span>
              </div>
              <p className="mt-2 text-muted-foreground">{event.description}</p>
              {event.entityType === "crm_lead" && event.entityId ? (
                <Link
                  href={`/crm/leads/${event.entityId}`}
                  className="mt-2 inline-block text-xs font-medium underline-offset-4 hover:underline"
                >
                  Bekijk lead
                </Link>
              ) : null}
              {event.entityType === "deal" && event.entityId ? (
                <Link
                  href={`/crm/deals/${event.entityId}`}
                  className="mt-2 inline-block text-xs font-medium underline-offset-4 hover:underline"
                >
                  Bekijk deal
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
