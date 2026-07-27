import type { Metadata } from "next";

import { AddonsManager } from "@/components/billing/addons-manager";
import { BillingSubnav } from "@/components/billing/billing-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { BILLING_UI } from "@/lib/billing/constants";
import { listAddons } from "@/lib/billing/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { hasSecurityPermission } from "@/lib/security/permissions";

export const metadata: Metadata = { title: BILLING_UI.addonsTitle };

export default async function BillingAddonsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  const addons = await listAddons();
  const canManage = hasSecurityPermission(
    context.membership.role,
    "billing",
    "manage",
  );

  return (
    <div>
      <PageHeader
        title={BILLING_UI.addonsTitle}
        description="Extra users, storage, AI credits, API calls, and support."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: BILLING_UI.hubTitle, href: "/billing" },
          { label: BILLING_UI.addonsTitle },
        ]}
      />
      <BillingSubnav />
      <AddonsManager addons={addons} canManage={canManage} />
    </div>
  );
}
