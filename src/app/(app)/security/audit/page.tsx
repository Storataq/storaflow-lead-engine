import type { Metadata } from "next";

import { AuditLogViewer } from "@/components/security/audit-log-viewer";
import { SecuritySubnav } from "@/components/security/security-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { SECURITY_UI } from "@/lib/security/constants";
import { listSecurityAudit } from "@/lib/security/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: SECURITY_UI.auditTitle };

export default async function SecurityAuditPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  const events = await listSecurityAudit(context.organization.id, 120);

  return (
    <div>
      <PageHeader
        title={SECURITY_UI.auditTitle}
        description="Enterprise audit: login, MFA, roles, API keys, exports, security settings."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: SECURITY_UI.hubTitle, href: "/security" },
          { label: SECURITY_UI.auditTitle },
        ]}
      />
      <SecuritySubnav />
      <AuditLogViewer events={events} />
    </div>
  );
}
