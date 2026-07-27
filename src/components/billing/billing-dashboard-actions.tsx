"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  convertTrialAction,
  createDemoInvoiceAction,
  extendTrialAction,
  openCustomerPortalAction,
  redeemCouponAction,
  startCheckoutAction,
  startTrialAction,
} from "@/lib/billing/actions";
import { BILLING_UI } from "@/lib/billing/constants";

type Props = {
  canManage: boolean;
  hasSubscription: boolean;
  isTrialing: boolean;
  recommendedPlanCode?: string;
};

export function BillingDashboardActions({
  canManage,
  hasSubscription,
  isTrialing,
  recommendedPlanCode = "professional_month",
}: Props) {
  const [pending, startTransition] = useTransition();
  const [coupon, setCoupon] = useState("");
  const [extendDays, setExtendDays] = useState("7");

  if (!canManage) {
    return (
      <p className="text-sm text-muted-foreground">
        View-only. Owners and admins can manage billing.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {!hasSubscription ? (
        <Button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await startTrialAction();
              toast[r.success ? "success" : "error"](r.message);
            })
          }
        >
          {BILLING_UI.startTrial}
        </Button>
      ) : null}
      {isTrialing ? (
        <Button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await convertTrialAction(recommendedPlanCode);
              toast[r.success ? "success" : "error"](r.message);
            })
          }
        >
          {BILLING_UI.convertTrial}
        </Button>
      ) : null}
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await startCheckoutAction({
              planCode: recommendedPlanCode,
            });
            toast[r.success ? "success" : "error"](r.message);
            if (r.url) window.location.href = r.url;
          })
        }
      >
        Stripe checkout
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await openCustomerPortalAction();
            toast[r.success ? "success" : "error"](r.message);
            if (r.url) window.location.href = r.url;
          })
        }
      >
        {BILLING_UI.openCustomerPortal}
      </Button>
      <Button
        type="button"
        variant="ghost"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await createDemoInvoiceAction();
            toast[r.success ? "success" : "error"](r.message);
          })
        }
      >
        Create demo invoice
      </Button>
      {isTrialing ? (
        <div className="flex items-end gap-2">
          <div>
            <Label htmlFor="extend-days">Extend trial (days)</Label>
            <Input
              id="extend-days"
              className="w-24"
              value={extendDays}
              onChange={(e) => setExtendDays(e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await extendTrialAction(Number(extendDays) || 7);
                toast[r.success ? "success" : "error"](r.message);
              })
            }
          >
            Extend
          </Button>
        </div>
      ) : null}
      <div className="flex items-end gap-2">
        <div>
          <Label htmlFor="coupon">Coupon</Label>
          <Input
            id="coupon"
            className="w-40"
            value={coupon}
            onChange={(e) => setCoupon(e.target.value)}
            placeholder="CODE"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={pending || !coupon.trim()}
          onClick={() =>
            startTransition(async () => {
              const r = await redeemCouponAction(coupon);
              toast[r.success ? "success" : "error"](r.message);
            })
          }
        >
          Apply
        </Button>
      </div>
    </div>
  );
}
