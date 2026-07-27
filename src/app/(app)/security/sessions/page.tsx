import type { Metadata } from "next";

import { SecuritySubnav } from "@/components/security/security-subnav";
import { SessionsManager } from "@/components/security/sessions-manager";
import { PageHeader } from "@/components/layout/page-header";
import { SECURITY_UI } from "@/lib/security/constants";
import { listUserSessions } from "@/lib/security/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: SECURITY_UI.sessionsTitle };

export default async function SecuritySessionsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  const sessions = await listUserSessions(context.membership.user_id);

  return (
    <div>
      <PageHeader
        title={SECURITY_UI.sessionsTitle}
        description="Browser, OS, device, IP, login time, last activity — terminate sessions."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: SECURITY_UI.hubTitle, href: "/security" },
          { label: SECURITY_UI.sessionsTitle },
        ]}
      />
      <SecuritySubnav />
      <SessionsManager sessions={sessions} />
    </div>
  );
}
