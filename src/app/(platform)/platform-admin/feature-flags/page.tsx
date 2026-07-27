import type { Metadata } from "next";

import { FeatureFlagsManager } from "@/components/platform-admin/admin-forms";
import { PlatformAdminSubnav } from "@/components/platform-admin/platform-admin-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { requirePlatformAdmin } from "@/lib/platform-admin/auth";
import { PLATFORM_UI } from "@/lib/platform-admin/constants";
import { hasPlatformPermission } from "@/lib/platform-admin/permissions";
import { listPlatformFeatureFlags } from "@/lib/platform-admin/queries";

export const metadata: Metadata = { title: PLATFORM_UI.featureFlagsTitle };

export default async function PlatformFeatureFlagsPage() {
  const admin = await requirePlatformAdmin();
  const flags = await listPlatformFeatureFlags();

  return (
    <div>
      <PageHeader
        title={PLATFORM_UI.featureFlagsTitle}
        description="Global, org, beta, experimental, early access, emergency disable."
        breadcrumbs={[
          { label: PLATFORM_UI.hubTitle, href: "/platform-admin" },
          { label: PLATFORM_UI.featureFlagsTitle },
        ]}
      />
      <PlatformAdminSubnav />
      <FeatureFlagsManager
        flags={flags}
        canManage={hasPlatformPermission(admin.role, "feature_flags:manage")}
      />
    </div>
  );
}
