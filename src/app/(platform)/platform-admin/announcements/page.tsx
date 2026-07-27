import type { Metadata } from "next";

import { AnnouncementsManager } from "@/components/platform-admin/admin-forms";
import { PlatformAdminSubnav } from "@/components/platform-admin/platform-admin-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { requirePlatformAdmin } from "@/lib/platform-admin/auth";
import { PLATFORM_UI } from "@/lib/platform-admin/constants";
import { hasPlatformPermission } from "@/lib/platform-admin/permissions";
import { listPlatformAnnouncements } from "@/lib/platform-admin/queries";

export const metadata: Metadata = { title: PLATFORM_UI.announcementsTitle };

export default async function PlatformAnnouncementsPage() {
  const admin = await requirePlatformAdmin();
  const announcements = await listPlatformAnnouncements();

  return (
    <div>
      <PageHeader
        title={PLATFORM_UI.announcementsTitle}
        description="Maintenance, release notes, security notices, feature releases."
        breadcrumbs={[
          { label: PLATFORM_UI.hubTitle, href: "/platform-admin" },
          { label: PLATFORM_UI.announcementsTitle },
        ]}
      />
      <PlatformAdminSubnav />
      <AnnouncementsManager
        announcements={announcements}
        canManage={hasPlatformPermission(admin.role, "announcements:manage")}
      />
    </div>
  );
}
