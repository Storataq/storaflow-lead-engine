import type { Metadata } from "next";

import { RolesManager } from "@/components/security/roles-manager";
import { SecuritySubnav } from "@/components/security/security-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { SECURITY_UI } from "@/lib/security/constants";
import { isSecurityAdmin } from "@/lib/security/permissions";
import { listCustomRoles } from "@/lib/security/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: SECURITY_UI.rolesTitle };

export default async function SecurityRolesPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  const roles = await listCustomRoles(context.organization.id);

  return (
    <div>
      <PageHeader
        title={SECURITY_UI.rolesTitle}
        description="Custom roles, templates, granular permissions, permission preview."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: SECURITY_UI.hubTitle, href: "/security" },
          { label: SECURITY_UI.rolesTitle },
        ]}
      />
      <SecuritySubnav />
      <RolesManager
        roles={roles}
        canManage={isSecurityAdmin(context.membership.role)}
      />
    </div>
  );
}
