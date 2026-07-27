import type { Metadata } from "next";

import { OrganizationsManager } from "@/components/platform-admin/organizations-manager";
import { PlatformAdminSubnav } from "@/components/platform-admin/platform-admin-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { requirePlatformAdmin } from "@/lib/platform-admin/auth";
import { PLATFORM_UI } from "@/lib/platform-admin/constants";
import { hasPlatformPermission } from "@/lib/platform-admin/permissions";
import { listPlatformOrganizations } from "@/lib/platform-admin/queries";

export const metadata: Metadata = { title: PLATFORM_UI.organizationsTitle };

export default async function PlatformOrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const admin = await requirePlatformAdmin();
  const params = await searchParams;
  const { rows } = await listPlatformOrganizations({
    q: params.q,
    status: params.status,
    limit: 100,
  });

  return (
    <div>
      <PageHeader
        title={PLATFORM_UI.organizationsTitle}
        description="Search, suspend, archive, soft-delete, and inspect tenants."
        breadcrumbs={[
          { label: PLATFORM_UI.hubTitle, href: "/platform-admin" },
          { label: PLATFORM_UI.organizationsTitle },
        ]}
      />
      <PlatformAdminSubnav />
      <OrganizationsManager
        organizations={rows}
        canManage={hasPlatformPermission(admin.role, "organizations:manage")}
        canImpersonate={hasPlatformPermission(
          admin.role,
          "impersonate:read_only",
        )}
      />
    </div>
  );
}
