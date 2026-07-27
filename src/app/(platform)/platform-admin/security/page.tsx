import type { Metadata } from "next";

import { PlatformAdminSubnav } from "@/components/platform-admin/platform-admin-subnav";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePlatformAdmin } from "@/lib/platform-admin/auth";
import { PLATFORM_UI } from "@/lib/platform-admin/constants";
import { getSecurityOverview } from "@/lib/platform-admin/queries";

export const metadata: Metadata = { title: PLATFORM_UI.securityTitle };

export default async function PlatformSecurityPage() {
  await requirePlatformAdmin();
  const security = await getSecurityOverview();

  const widgets = [
    { label: "Failed logins", value: security.failedLogins },
    { label: "Suspicious activity", value: security.suspiciousActivity },
    { label: "Locked accounts", value: security.lockedAccounts },
    { label: "Expired sessions", value: security.expiredSessions },
    { label: "Disabled MFA", value: security.disabledMfa },
    { label: "Security alerts", value: security.openAlerts },
  ] as const;

  return (
    <div>
      <PageHeader
        title={PLATFORM_UI.securityTitle}
        description="Cross-tenant security signals from the enterprise security module."
        breadcrumbs={[
          { label: PLATFORM_UI.hubTitle, href: "/platform-admin" },
          { label: PLATFORM_UI.securityTitle },
        ]}
      />
      <PlatformAdminSubnav />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {widgets.map((w) => (
          <Card key={w.label} className="shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{w.label}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{w.value}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
