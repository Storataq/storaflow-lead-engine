"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createDemoInvoiceAction } from "@/lib/billing/actions";
import { BILLING_UI } from "@/lib/billing/constants";
import type { BillingInvoiceRow } from "@/lib/billing/types";
import { formatDateTime } from "@/lib/ui/format";

type Props = { invoices: BillingInvoiceRow[]; canManage: boolean };

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function InvoicesManager({ invoices, canManage }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      {canManage ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
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
      ) : null}
      {invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {BILLING_UI.emptyInvoices}
        </p>
      ) : (
        <ul className="space-y-2">
          {invoices.map((inv) => (
            <li
              key={inv.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">{inv.number ?? inv.id.slice(0, 8)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(inv.created_at)} ·{" "}
                  {formatMoney(inv.amount_due_cents, inv.currency)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{inv.status}</Badge>
                {inv.invoice_pdf_url ? (
                  <Button
                    nativeButton={false}
                    size="sm"
                    variant="ghost"
                    render={
                      <a
                        href={inv.invoice_pdf_url}
                        target="_blank"
                        rel="noreferrer"
                      />
                    }
                  >
                    PDF
                  </Button>
                ) : null}
                {inv.hosted_invoice_url ? (
                  <Button
                    nativeButton={false}
                    size="sm"
                    variant="outline"
                    render={
                      <a
                        href={inv.hosted_invoice_url}
                        target="_blank"
                        rel="noreferrer"
                      />
                    }
                  >
                    Pay / retry
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
