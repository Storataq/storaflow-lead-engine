import type { Metadata } from "next";

import { SettingsManager } from "@/components/platform-admin/admin-forms";
import { PlatformAdminSubnav } from "@/components/platform-admin/platform-admin-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { requirePlatformAdmin } from "@/lib/platform-admin/auth";
import { PLATFORM_UI } from "@/lib/platform-admin/constants";
import { hasPlatformPermission } from "@/lib/platform-admin/permissions";
import { listPlatformSettings } from "@/lib/platform-admin/queries";

export const metadata: Metadata = { title: PLATFORM_UI.settingsTitle };

export default async function PlatformSettingsPage() {
  const admin = await requirePlatformAdmin();
  const settings = await listPlatformSettings();

  return (
    <div>
      <PageHeader
        title={PLATFORM_UI.settingsTitle}
        description="Trial length, registration, maintenance mode, default limits, rollouts."
        breadcrumbs={[
          { label: PLATFORM_UI.hubTitle, href: "/platform-admin" },
          { label: PLATFORM_UI.settingsTitle },
        ]}
      />
      <PlatformAdminSubnav />
      <SettingsManager
        settings={settings}
        canManage={hasPlatformPermission(admin.role, "settings:manage")}
      />
      <p className="mt-4 text-xs text-muted-foreground">
        {PLATFORM_UI.futureBackup} · {PLATFORM_UI.futureImportExport} ·{" "}
        {PLATFORM_UI.futureDisasterRecovery}
      </p>
    </div>
  );
}
