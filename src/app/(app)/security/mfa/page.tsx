import type { Metadata } from "next";

import { MfaManager } from "@/components/security/mfa-manager";
import { SecuritySubnav } from "@/components/security/security-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { SECURITY_UI } from "@/lib/security/constants";
import {
  ensureSecurityPolicies,
  getMfaSettings,
} from "@/lib/security/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: SECURITY_UI.mfaTitle };

export default async function SecurityMfaPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  const [mfa, policy] = await Promise.all([
    getMfaSettings(context.membership.user_id),
    ensureSecurityPolicies(
      context.organization.id,
      context.membership.user_id,
    ),
  ]);

  return (
    <div>
      <PageHeader
        title={SECURITY_UI.mfaTitle}
        description="Authenticator apps, recovery codes, email backup, trusted devices."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: SECURITY_UI.hubTitle, href: "/security" },
          { label: SECURITY_UI.mfaTitle },
        ]}
      />
      <SecuritySubnav />
      <MfaManager mfa={mfa} forceMfa={Boolean(policy?.force_mfa)} />
    </div>
  );
}
