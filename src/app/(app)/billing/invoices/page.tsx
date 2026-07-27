import type { Metadata } from "next";

import { BillingSubnav } from "@/components/billing/billing-subnav";
import { InvoicesManager } from "@/components/billing/invoices-manager";
import { PageHeader } from "@/components/layout/page-header";
import { BILLING_UI } from "@/lib/billing/constants";
import { listInvoices } from "@/lib/billing/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { hasSecurityPermission } from "@/lib/security/permissions";

export const metadata: Metadata = { title: BILLING_UI.invoicesTitle };

export default async function BillingInvoicesPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  const invoices = await listInvoices(context.organization.id);
  const canManage = hasSecurityPermission(
    context.membership.role,
    "billing",
    "manage",
  );

  return (
    <div>
      <PageHeader
        title={BILLING_UI.invoicesTitle}
        description="View status, download PDF, retry payment, and payment history."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: BILLING_UI.hubTitle, href: "/billing" },
          { label: BILLING_UI.invoicesTitle },
        ]}
      />
      <BillingSubnav />
      <InvoicesManager invoices={invoices} canManage={canManage} />
    </div>
  );
}
