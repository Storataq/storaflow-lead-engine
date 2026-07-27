import type { Metadata } from "next";

import { CollaborationSubnav } from "@/components/collaboration/collaboration-subnav";
import { NotificationsCenter } from "@/components/collaboration/notifications-center";
import { PageHeader } from "@/components/layout/page-header";
import { COLLAB_UI } from "@/lib/collaboration/constants";
import { listNotifications } from "@/lib/collaboration/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: COLLAB_UI.notificationsTitle };

export default async function NotificationsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  const notifications = await listNotifications(
    context.organization.id,
    context.membership.user_id,
    { limit: 80 },
  );

  return (
    <div>
      <PageHeader
        title={COLLAB_UI.notificationsTitle}
        description="In-app notification center with archive, dismiss, and multi-channel flags."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: COLLAB_UI.hubTitle, href: "/collaboration" },
          { label: COLLAB_UI.notificationsTitle },
        ]}
      />
      <CollaborationSubnav />
      <NotificationsCenter notifications={notifications} />
    </div>
  );
}
