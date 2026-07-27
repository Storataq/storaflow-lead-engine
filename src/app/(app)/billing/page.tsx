import type { Metadata } from "next";
import Link from "next/link";

import { BillingDashboardActions } from "@/components/billing/billing-dashboard-actions";
import { BillingNotificationsList } from "@/components/billing/billing-notifications-list";
import { BillingSubnav } from "@/components/billing/billing-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BILLING_INTERVAL_LABELS,
  BILLING_LIMIT_LABELS,
  BILLING_UI,
  SUBSCRIPTION_STATUS_LABELS,
  type BillingInterval,
  type BillingLimitKey,
  type SubscriptionStatus,
} from "@/lib/billing/constants";
import { checkLimit } from "@/lib/billing/limit-engine";
import {
  getFinancialMetricsScaffold,
  listBillingNotifications,
  listInvoices,
  listPaymentMethods,
  resolveBillingContext,
} from "@/lib/billing/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { hasSecurityPermission } from "@/lib/security/permissions";
import { formatDateTime } from "@/lib/ui/format";

export const metadata: Metadata = { title: BILLING_UI.hubTitle };

export default async function BillingDashboardPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  const orgId = context.organization.id;
  const canManage = hasSecurityPermission(
    context.membership.role,
    "billing",
    "manage",
  );

  const [billing, invoices, methods, notifications, metrics] =
    await Promise.all([
      resolveBillingContext(orgId),
      listInvoices(orgId),
      listPaymentMethods(orgId),
      listBillingNotifications(orgId),
      getFinancialMetricsScaffold(),
    ]);

  const statusLabel = billing.subscription
    ? SUBSCRIPTION_STATUS_LABELS[
        billing.subscription.status as SubscriptionStatus
      ] ?? billing.subscription.status
    : "None";

  const usageWidgets = (
    Object.keys(BILLING_LIMIT_LABELS) as BillingLimitKey[]
  ).map((key) => {
    const def = billing.limits[key] ?? {
      limitKey: key,
      limitValue: 0,
      warningThresholdPct: 80,
      enforcement: "hard" as const,
    };
    const current = Number(billing.usage[key] ?? 0);
    const result = checkLimit(def, current, 0);
    return {
      key,
      label: BILLING_LIMIT_LABELS[key],
      current,
      limit: def.limitValue,
      pct: result.pctUsed,
      warning: result.isWarning || result.isHardBlocked,
    };
  });

  return (
    <div>
      <PageHeader
        title={BILLING_UI.dashboardTitle}
        description={BILLING_UI.hubDescription}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: BILLING_UI.hubTitle },
        ]}
      />
      <BillingSubnav />

      <div className="mb-6">
        <BillingDashboardActions
          canManage={canManage}
          hasSubscription={Boolean(billing.subscription)}
          isTrialing={billing.subscription?.status === "trialing"}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>{BILLING_UI.currentPlan}</CardDescription>
            <CardTitle className="text-xl">
              {billing.plan?.name ?? "—"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">{statusLabel}</Badge>
            {billing.trialDaysRemaining != null ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {billing.trialDaysRemaining} trial days left
              </p>
            ) : null}
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>{BILLING_UI.billingCycle}</CardDescription>
            <CardTitle className="text-xl">
              {billing.subscription
                ? BILLING_INTERVAL_LABELS[
                    billing.subscription.billing_interval as BillingInterval
                  ] ?? billing.subscription.billing_interval
                : "—"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>{BILLING_UI.renewalDate}</CardDescription>
            <CardTitle className="text-xl">
              {billing.subscription?.current_period_end
                ? formatDateTime(billing.subscription.current_period_end)
                : "—"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Seats</CardDescription>
            <CardTitle className="text-xl">
              {billing.seatsUsed} / {billing.seatsPurchased}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Usage</CardTitle>
            <CardDescription>
              Central limit engine — soft/hard thresholds
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {usageWidgets.slice(0, 6).map((w) => (
              <div key={w.key} className="flex justify-between gap-2">
                <span>
                  {w.label}
                  {w.warning ? (
                    <Badge className="ml-2" variant="destructive">
                      {BILLING_UI.limitWarning}
                    </Badge>
                  ) : null}
                </span>
                <span className="text-muted-foreground">
                  {w.current} / {w.limit} ({w.pct}%)
                </span>
              </div>
            ))}
            <Button
              nativeButton={false}
              variant="outline"
              size="sm"
              render={<Link href="/billing/usage" />}
            >
              Full usage
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Invoices & payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              Upcoming / latest:{" "}
              {invoices[0]
                ? `${invoices[0].number ?? "Invoice"} · ${invoices[0].status}`
                : BILLING_UI.emptyInvoices}
            </p>
            <p>
              Payment method:{" "}
              {methods[0]
                ? `${methods[0].brand ?? methods[0].method_type} ···· ${methods[0].last4 ?? "····"}`
                : "None on file (provider-hosted)"}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                nativeButton={false}
                variant="outline"
                size="sm"
                render={<Link href="/billing/invoices" />}
              >
                View invoices
              </Button>
              <Button
                nativeButton={false}
                variant="outline"
                size="sm"
                render={<Link href="/billing/plans" />}
              >
                Available upgrades
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Billing notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <BillingNotificationsList notifications={notifications.slice(0, 5)} />
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Financial reporting</CardTitle>
            <CardDescription>Platform metrics scaffold (MRR/ARR)</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">MRR</p>
              <p className="text-lg font-semibold">
                €{(metrics.mrrCents / 100).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">ARR</p>
              <p className="text-lg font-semibold">
                €{(metrics.arrCents / 100).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Active</p>
              <p className="text-lg font-semibold">
                {metrics.activeSubscriptions}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Trialing</p>
              <p className="text-lg font-semibold">{metrics.trialing}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
