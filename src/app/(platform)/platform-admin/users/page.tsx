import type { Metadata } from "next";

import { UsersManager } from "@/components/platform-admin/users-manager";
import { PlatformAdminSubnav } from "@/components/platform-admin/platform-admin-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { requirePlatformAdmin } from "@/lib/platform-admin/auth";
import { PLATFORM_UI } from "@/lib/platform-admin/constants";
import { hasPlatformPermission } from "@/lib/platform-admin/permissions";
import { listPlatformUsers } from "@/lib/platform-admin/queries";

export const metadata: Metadata = { title: PLATFORM_UI.usersTitle };

export default async function PlatformUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const admin = await requirePlatformAdmin();
  const params = await searchParams;
  const users = await listPlatformUsers({ q: params.q, limit: 150 });

  return (
    <div>
      <PageHeader
        title={PLATFORM_UI.usersTitle}
        description="Cross-tenant users — suspend, unlock, force reset, disable MFA."
        breadcrumbs={[
          { label: PLATFORM_UI.hubTitle, href: "/platform-admin" },
          { label: PLATFORM_UI.usersTitle },
        ]}
      />
      <PlatformAdminSubnav />
      <UsersManager
        users={users}
        canManage={hasPlatformPermission(admin.role, "users:manage")}
      />
    </div>
  );
}
