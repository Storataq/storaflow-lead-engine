import type { Metadata } from "next";
import Link from "next/link";

import { CollaborationSubnav } from "@/components/collaboration/collaboration-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { COLLAB_UI } from "@/lib/collaboration/constants";
import {
  countUnreadNotifications,
  getUnifiedActivityFeed,
  listTeams,
} from "@/lib/collaboration/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { formatDateTime, formatStatusLabel } from "@/lib/ui/format";

export const metadata: Metadata = { title: COLLAB_UI.hubTitle };

export default async function CollaborationHubPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  const [unread, teams, feed] = await Promise.all([
    countUnreadNotifications(
      context.organization.id,
      context.membership.user_id,
    ),
    listTeams(context.organization.id),
    getUnifiedActivityFeed(context.organization.id, 12),
  ]);

  const cards = [
    {
      title: COLLAB_UI.notificationsTitle,
      href: "/collaboration/notifications",
      description: `${unread} unread · in-app + channel-ready`,
    },
    {
      title: COLLAB_UI.teamsTitle,
      href: "/collaboration/teams",
      description: `${teams.length} active team spaces`,
    },
    {
      title: COLLAB_UI.knowledgeTitle,
      href: "/collaboration/knowledge",
      description: "Articles, categories, favorites, versions",
    },
    {
      title: COLLAB_UI.notesTitle,
      href: "/collaboration/notes",
      description: "Shared collaborative notes",
    },
    {
      title: COLLAB_UI.meetingsTitle,
      href: "/collaboration/meetings",
      description: "Agenda, notes, action items, AI recap",
    },
    {
      title: COLLAB_UI.activityTitle,
      href: "/activity",
      description: "Unified created/updated/comment/mention feed",
    },
  ] as const;

  return (
    <div>
      <PageHeader
        title={COLLAB_UI.hubTitle}
        description={COLLAB_UI.hubDescription}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: COLLAB_UI.hubTitle },
        ]}
      />
      <CollaborationSubnav />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.href} className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">{card.title}</CardTitle>
              <CardDescription>{card.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                nativeButton={false}
                variant="outline"
                render={<Link href={card.href} />}
              >
                Open
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="mt-8 space-y-3">
        <h2 className="text-sm font-semibold">Recent activity</h2>
        {feed.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Collaboration events will appear here after migration 00037.
          </p>
        ) : (
          <ul className="space-y-2">
            {feed.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-border px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-medium">
                    {formatStatusLabel(item.eventType)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(item.createdAt)}
                  </span>
                </div>
                <p className="text-muted-foreground">{item.description}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-8 text-xs text-muted-foreground">
        {COLLAB_UI.futurePresence} · {COLLAB_UI.futureChat} ·{" "}
        {COLLAB_UI.futureVideo}
      </p>
    </div>
  );
}
