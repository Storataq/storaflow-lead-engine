import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { PwaSettingsPanel } from "@/components/pwa/pwa-settings-panel";
import { PWA_UI } from "@/lib/pwa/constants";

export const metadata: Metadata = { title: PWA_UI.hubTitle };

export default function MobilePwaSettingsPage() {
  return (
    <div>
      <PageHeader
        title={PWA_UI.hubTitle}
        description="Install, offline sync, push notifications, and device capabilities."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Settings", href: "/settings" },
          { label: PWA_UI.hubTitle },
        ]}
      />
      <PwaSettingsPanel />
    </div>
  );
}
