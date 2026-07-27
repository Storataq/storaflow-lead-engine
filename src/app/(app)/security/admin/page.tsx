import type { Metadata } from "next";

import { SecurityAdminTools } from "@/components/security/security-admin-tools";
import { SecuritySubnav } from "@/components/security/security-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { SECURITY_UI } from "@/lib/security/constants";
import { isSecurityAdmin } from "@/lib/security/permissions";
import { listOrganizationMembers } from "@/lib/crm/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: SECURITY_UI.adminTitle };

export default async function SecurityAdminPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  const members = await listOrganizationMembers(context.organization.id).catch(
    () => [],
  );

  return (
    <div>
      <PageHeader
        title={SECURITY_UI.adminTitle}
        description="Reset MFA, force logout, lock/unlock accounts."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: SECURITY_UI.hubTitle, href: "/security" },
          { label: SECURITY_UI.adminTitle },
        ]}
      />
      <SecuritySubnav />
      <SecurityAdminTools
        members={members.map((m) => ({ userId: m.userId, label: m.label }))}
        canManage={isSecurityAdmin(context.membership.role)}
      />
    </div>
  );
}
