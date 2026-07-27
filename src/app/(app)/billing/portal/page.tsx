import type { Metadata } from "next";

import { BillingSubnav } from "@/components/billing/billing-subnav";
import { PortalManager } from "@/components/billing/portal-manager";
import { PageHeader } from "@/components/layout/page-header";
import { BILLING_UI } from "@/lib/billing/constants";
import { resolveBillingContext } from "@/lib/billing/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { hasSecurityPermission } from "@/lib/security/permissions";

export const metadata: Metadata = { title: BILLING_UI.portalTitle };

export default async function BillingPortalPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  const billing = await resolveBillingContext(context.organization.id);
  const canManage = hasSecurityPermission(
    context.membership.role,
    "billing",
    "manage",
  );

  return (
    <div>
      <PageHeader
        title={BILLING_UI.portalTitle}
        description="Subscription, payment method, invoices, billing address, tax & VAT."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: BILLING_UI.hubTitle, href: "/billing" },
          { label: BILLING_UI.portalTitle },
        ]}
      />
      <BillingSubnav />
      <PortalManager customer={billing.customer} canManage={canManage} />
    </div>
  );
}
