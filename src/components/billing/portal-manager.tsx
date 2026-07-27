"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  openCustomerPortalAction,
  updateBillingDetailsAction,
} from "@/lib/billing/actions";
import { BILLING_UI } from "@/lib/billing/constants";
import type { BillingCustomerRow } from "@/lib/billing/types";

type Props = {
  customer: BillingCustomerRow | null;
  canManage: boolean;
};

export function PortalManager({ customer, canManage }: Props) {
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState(customer?.billing_email ?? "");
  const [name, setName] = useState(customer?.billing_name ?? "");
  const [vat, setVat] = useState(customer?.vat_number ?? "");
  const [taxId, setTaxId] = useState(customer?.tax_id ?? "");

  if (!canManage) {
    return (
      <p className="text-sm text-muted-foreground">
        Only billing admins can update billing details.
      </p>
    );
  }

  return (
    <div className="max-w-lg space-y-4">
      <p className="text-sm text-muted-foreground">
        Self-service portal for subscription, payment method, tax, and VAT.
        Cards never touch Storaflow servers — {BILLING_UI.futureApplePay}.
      </p>
      <div className="grid gap-3">
        <div>
          <Label htmlFor="billing-name">Billing name</Label>
          <Input
            id="billing-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="billing-email">Billing email</Label>
          <Input
            id="billing-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="vat">VAT number</Label>
          <Input
            id="vat"
            value={vat}
            onChange={(e) => setVat(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="tax">Tax ID</Label>
          <Input
            id="tax"
            value={taxId}
            onChange={(e) => setTaxId(e.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await updateBillingDetailsAction({
                billingEmail: email,
                billingName: name,
                vatNumber: vat,
                taxId,
              });
              toast[r.success ? "success" : "error"](r.message);
            })
          }
        >
          Save billing details
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
          {BILLING_UI.managePayment}
        </Button>
      </div>
    </div>
  );
}
