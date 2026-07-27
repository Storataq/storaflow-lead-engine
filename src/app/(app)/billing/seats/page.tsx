import type { Metadata } from "next";

import { BillingSubnav } from "@/components/billing/billing-subnav";
import { SeatsManager } from "@/components/billing/seats-manager";
import { PageHeader } from "@/components/layout/page-header";
import { BILLING_UI } from "@/lib/billing/constants";
import {
  listSeatLedger,
  resolveBillingContext,
} from "@/lib/billing/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { hasSecurityPermission } from "@/lib/security/permissions";

export const metadata: Metadata = { title: BILLING_UI.seatsTitle };

export default async function BillingSeatsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  const [billing, ledger] = await Promise.all([
    resolveBillingContext(context.organization.id),
    listSeatLedger(context.organization.id),
  ]);
  const canManage = hasSecurityPermission(
    context.membership.role,
    "billing",
    "manage",
  );

  return (
    <div>
      <PageHeader
        title={BILLING_UI.seatsTitle}
        description="Purchased, used, and available seats with history."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: BILLING_UI.hubTitle, href: "/billing" },
          { label: BILLING_UI.seatsTitle },
        ]}
      />
      <BillingSubnav />
      <SeatsManager
        seatsPurchased={billing.seatsPurchased}
        seatsUsed={billing.seatsUsed}
        ledger={ledger}
        canManage={canManage}
      />
    </div>
  );
}
