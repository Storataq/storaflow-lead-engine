import type { Metadata } from "next";

import { BillingSubnav } from "@/components/billing/billing-subnav";
import { PlansManager } from "@/components/billing/plans-manager";
import { PageHeader } from "@/components/layout/page-header";
import { BILLING_UI } from "@/lib/billing/constants";
import {
  listBillingPlans,
  resolveBillingContext,
} from "@/lib/billing/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { hasSecurityPermission } from "@/lib/security/permissions";

export const metadata: Metadata = { title: BILLING_UI.plansTitle };

export default async function BillingPlansPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  const [plans, billing] = await Promise.all([
    listBillingPlans(),
    resolveBillingContext(context.organization.id),
  ]);
  const canManage = hasSecurityPermission(
    context.membership.role,
    "billing",
    "manage",
  );

  return (
    <div>
      <PageHeader
        title={BILLING_UI.plansTitle}
        description="Compare plans, upgrade immediately, or schedule a downgrade."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: BILLING_UI.hubTitle, href: "/billing" },
          { label: BILLING_UI.plansTitle },
        ]}
      />
      <BillingSubnav />
      <PlansManager
        plans={plans}
        currentPlanId={billing.plan?.id ?? null}
        canManage={canManage}
      />
    </div>
  );
}
