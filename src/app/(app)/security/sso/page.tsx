import type { Metadata } from "next";

import { SecuritySubnav } from "@/components/security/security-subnav";
import { SsoManager } from "@/components/security/sso-manager";
import { PageHeader } from "@/components/layout/page-header";
import { SECURITY_UI } from "@/lib/security/constants";
import { isSecurityAdmin } from "@/lib/security/permissions";
import { listSsoProviders } from "@/lib/security/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: SECURITY_UI.ssoTitle };

export default async function SecuritySsoPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  const providers = await listSsoProviders(context.organization.id);

  return (
    <div>
      <PageHeader
        title={SECURITY_UI.ssoTitle}
        description="Organization-controlled SAML / OIDC and major IdPs."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: SECURITY_UI.hubTitle, href: "/security" },
          { label: SECURITY_UI.ssoTitle },
        ]}
      />
      <SecuritySubnav />
      <SsoManager
        providers={providers}
        canManage={isSecurityAdmin(context.membership.role)}
      />
    </div>
  );
}
