import type { Metadata } from "next";

import { PoliciesManager } from "@/components/security/policies-manager";
import { SecuritySubnav } from "@/components/security/security-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { SECURITY_UI } from "@/lib/security/constants";
import { isSecurityAdmin } from "@/lib/security/permissions";
import { ensureSecurityPolicies } from "@/lib/security/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: SECURITY_UI.policiesTitle };

export default async function SecurityPoliciesPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  const policy = await ensureSecurityPolicies(
    context.organization.id,
    context.membership.user_id,
  );

  return (
    <div>
      <PageHeader
        title={SECURITY_UI.policiesTitle}
        description="Password policy, MFA force, session timeouts, IP ranges, login methods."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: SECURITY_UI.hubTitle, href: "/security" },
          { label: SECURITY_UI.policiesTitle },
        ]}
      />
      <SecuritySubnav />
      <PoliciesManager
        policy={policy}
        canManage={isSecurityAdmin(context.membership.role)}
      />
    </div>
  );
}
