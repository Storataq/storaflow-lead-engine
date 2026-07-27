"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { changePlanAction, startCheckoutAction } from "@/lib/billing/actions";
import {
  BILLING_INTERVAL_LABELS,
  BILLING_PLAN_TIER_LABELS,
  BILLING_UI,
  type BillingInterval,
  type BillingPlanTier,
} from "@/lib/billing/constants";
import type { BillingPlanRow } from "@/lib/billing/types";

type Props = {
  plans: BillingPlanRow[];
  currentPlanId: string | null;
  canManage: boolean;
};

function formatPrice(cents: number, currency: string) {
  if (cents <= 0) return "Custom";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function PlansManager({ plans, currentPlanId, canManage }: Props) {
  const [pending, startTransition] = useTransition();

  if (plans.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{BILLING_UI.emptyPlans}</p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {plans.map((plan) => {
        const isCurrent = plan.id === currentPlanId;
        const tierLabel =
          BILLING_PLAN_TIER_LABELS[plan.plan_tier as BillingPlanTier] ??
          plan.plan_tier;
        return (
          <Card key={plan.id} className="shadow-none">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">{plan.name}</CardTitle>
                {isCurrent ? <Badge>Current</Badge> : null}
                <Badge variant="outline">{tierLabel}</Badge>
              </div>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-2xl font-semibold">
                {formatPrice(plan.price_cents, plan.currency)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  /
                  {BILLING_INTERVAL_LABELS[
                    plan.billing_interval as BillingInterval
                  ] ?? plan.billing_interval}
                </span>
              </p>
              <p className="text-muted-foreground">
                {plan.included_seats} seats included
              </p>
              {canManage && !isCurrent ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const r = await changePlanAction({
                          planCode: plan.code,
                          mode: "upgrade",
                        });
                        toast[r.success ? "success" : "error"](r.message);
                      })
                    }
                  >
                    {BILLING_UI.upgrade}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const r = await changePlanAction({
                          planCode: plan.code,
                          mode: "downgrade",
                        });
                        toast[r.success ? "success" : "error"](r.message);
                      })
                    }
                  >
                    {BILLING_UI.downgrade}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const r = await startCheckoutAction({
                          planCode: plan.code,
                        });
                        toast[r.success ? "success" : "error"](r.message);
                        if (r.url) window.location.href = r.url;
                      })
                    }
                  >
                    Checkout
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
