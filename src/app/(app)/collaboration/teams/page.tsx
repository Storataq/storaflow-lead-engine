import type { Metadata } from "next";

import { CollaborationSubnav } from "@/components/collaboration/collaboration-subnav";
import { TeamsManager } from "@/components/collaboration/teams-manager";
import { PageHeader } from "@/components/layout/page-header";
import { COLLAB_UI } from "@/lib/collaboration/constants";
import { isOrgAdmin } from "@/lib/collaboration/permissions";
import { listTeams } from "@/lib/collaboration/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: COLLAB_UI.teamsTitle };

export default async function TeamsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  const teams = await listTeams(context.organization.id);

  return (
    <div>
      <PageHeader
        title={COLLAB_UI.teamsTitle}
        description="Sales, marketing, support, management, and custom teams with members and permissions."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: COLLAB_UI.hubTitle, href: "/collaboration" },
          { label: COLLAB_UI.teamsTitle },
        ]}
      />
      <CollaborationSubnav />
      <TeamsManager
        teams={teams}
        canManage={isOrgAdmin(context.membership.role)}
      />
    </div>
  );
}
