import type { Metadata } from "next";

import { AlertsManager } from "@/components/security/alerts-manager";
import { SecuritySubnav } from "@/components/security/security-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { SECURITY_UI } from "@/lib/security/constants";
import { isSecurityAdmin } from "@/lib/security/permissions";
import { listSecurityAlerts } from "@/lib/security/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: SECURITY_UI.alertsTitle };

export default async function SecurityAlertsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  const alerts = await listSecurityAlerts(context.organization.id);

  return (
    <div>
      <PageHeader
        title={SECURITY_UI.alertsTitle}
        description="New device, failed login thresholds, role escalation, API abuse, and more."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: SECURITY_UI.hubTitle, href: "/security" },
          { label: SECURITY_UI.alertsTitle },
        ]}
      />
      <SecuritySubnav />
      <AlertsManager
        alerts={alerts}
        canManage={isSecurityAdmin(context.membership.role)}
      />
    </div>
  );
}
