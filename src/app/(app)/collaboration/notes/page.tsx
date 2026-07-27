import type { Metadata } from "next";

import { CollaborationSubnav } from "@/components/collaboration/collaboration-subnav";
import { SharedNotesManager } from "@/components/collaboration/shared-notes-manager";
import { PageHeader } from "@/components/layout/page-header";
import { COLLAB_UI } from "@/lib/collaboration/constants";
import { listSharedNotes } from "@/lib/collaboration/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: COLLAB_UI.notesTitle };

export default async function SharedNotesPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  const notes = await listSharedNotes(context.organization.id);

  return (
    <div>
      <PageHeader
        title={COLLAB_UI.notesTitle}
        description="Collaborative notes with rich content, mentions, and versioning."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: COLLAB_UI.hubTitle, href: "/collaboration" },
          { label: COLLAB_UI.notesTitle },
        ]}
      />
      <CollaborationSubnav />
      <SharedNotesManager notes={notes} />
    </div>
  );
}
