import type { Metadata } from "next";

import { CollaborationSubnav } from "@/components/collaboration/collaboration-subnav";
import { MeetingsManager } from "@/components/collaboration/meetings-manager";
import { PageHeader } from "@/components/layout/page-header";
import { COLLAB_UI } from "@/lib/collaboration/constants";
import { listMeetings } from "@/lib/collaboration/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: COLLAB_UI.meetingsTitle };

export default async function MeetingsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  const meetings = await listMeetings(context.organization.id);

  return (
    <div>
      <PageHeader
        title={COLLAB_UI.meetingsTitle}
        description="Meeting notes, agenda, participants, action items, and linked CRM records."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: COLLAB_UI.hubTitle, href: "/collaboration" },
          { label: COLLAB_UI.meetingsTitle },
        ]}
      />
      <CollaborationSubnav />
      <MeetingsManager meetings={meetings} />
    </div>
  );
}
