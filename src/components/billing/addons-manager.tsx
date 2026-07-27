"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { purchaseAddonAction } from "@/lib/billing/actions";
import { BILLING_UI } from "@/lib/billing/constants";
import type { BillingAddonRow } from "@/lib/billing/types";

type Props = { addons: BillingAddonRow[]; canManage: boolean };

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function AddonsManager({ addons, canManage }: Props) {
  const [pending, startTransition] = useTransition();

  if (addons.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No add-ons available yet. {BILLING_UI.futureUsageBilling}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {addons.map((addon) => (
        <li
          key={addon.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-3 text-sm"
        >
          <div>
            <p className="font-medium">{addon.name}</p>
            <p className="text-muted-foreground">{addon.description}</p>
            <div className="mt-1 flex gap-2">
              <Badge variant="outline">{addon.addon_type}</Badge>
              <Badge variant="secondary">
                {formatPrice(addon.price_cents, addon.currency)} /{" "}
                {addon.quantity_unit}
              </Badge>
            </div>
          </div>
          {canManage ? (
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await purchaseAddonAction({
                    addonCode: addon.code,
                    quantity: 1,
                  });
                  toast[r.success ? "success" : "error"](r.message);
                })
              }
            >
              Add
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
