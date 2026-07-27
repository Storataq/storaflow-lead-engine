import type { Metadata } from "next";

import { BillingSubnav } from "@/components/billing/billing-subnav";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BILLING_FEATURE_LABELS,
  BILLING_LIMIT_LABELS,
  BILLING_UI,
  type BillingFeatureKey,
  type BillingLimitKey,
} from "@/lib/billing/constants";
import { checkFeature, checkLimit } from "@/lib/billing/limit-engine";
import { resolveBillingContext } from "@/lib/billing/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: BILLING_UI.usageTitle };

export default async function BillingUsagePage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  const billing = await resolveBillingContext(context.organization.id);

  return (
    <div>
      <PageHeader
        title={BILLING_UI.usageTitle}
        description="AI, API, storage, seats, and campaign usage against plan limits."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: BILLING_UI.hubTitle, href: "/billing" },
          { label: BILLING_UI.usageTitle },
        ]}
      />
      <BillingSubnav />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(Object.keys(BILLING_LIMIT_LABELS) as BillingLimitKey[]).map((key) => {
          const def = billing.limits[key] ?? {
            limitKey: key,
            limitValue: 0,
            warningThresholdPct: 80,
            enforcement: "hard" as const,
          };
          const current = Number(billing.usage[key] ?? 0);
          const result = checkLimit(def, current, 0);
          return (
            <Card key={key} className="shadow-none">
              <CardHeader className="pb-2">
                <CardDescription>{BILLING_LIMIT_LABELS[key]}</CardDescription>
                <CardTitle className="text-2xl">
                  {current}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    / {def.limitValue}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {result.pctUsed}% · {def.enforcement} · {result.message}
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Card className="mt-6 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Feature flags</CardTitle>
          <CardDescription>
            Validated only through the centralized limit engine
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(BILLING_FEATURE_LABELS) as BillingFeatureKey[]).map(
            (key) => {
              const result = checkFeature(key, Boolean(billing.features[key]));
              return (
                <div
                  key={key}
                  className="flex justify-between rounded-md border border-border px-3 py-2 text-sm"
                >
                  <span>{BILLING_FEATURE_LABELS[key]}</span>
                  <span className="text-muted-foreground">
                    {result.enabled ? "On" : "Off — upgrade"}
                  </span>
                </div>
              );
            },
          )}
        </CardContent>
      </Card>
      <p className="mt-4 text-xs text-muted-foreground">
        Bandwidth metering — ready. {BILLING_UI.futureUsageBilling}
      </p>
    </div>
  );
}
