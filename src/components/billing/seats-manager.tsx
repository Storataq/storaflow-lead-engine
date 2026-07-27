"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adjustSeatsAction } from "@/lib/billing/actions";
import { BILLING_UI } from "@/lib/billing/constants";
import type { BillingSeatLedgerRow } from "@/lib/billing/types";
import { formatDateTime } from "@/lib/ui/format";

type Props = {
  seatsPurchased: number;
  seatsUsed: number;
  ledger: BillingSeatLedgerRow[];
  canManage: boolean;
};

export function SeatsManager({
  seatsPurchased,
  seatsUsed,
  ledger,
  canManage,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [seats, setSeats] = useState(String(seatsPurchased || 1));
  const available = Math.max(0, seatsPurchased - seatsUsed);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">Purchased</p>
          <p className="text-2xl font-semibold">{seatsPurchased}</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">Used</p>
          <p className="text-2xl font-semibold">{seatsUsed}</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">Available</p>
          <p className="text-2xl font-semibold">{available}</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {BILLING_UI.futureFloatingSeats}
      </p>
      {canManage ? (
        <div className="flex items-end gap-2">
          <div>
            <Label htmlFor="seats">Purchased seats</Label>
            <Input
              id="seats"
              className="w-32"
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
            />
          </div>
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await adjustSeatsAction({
                  seats: Number(seats) || 1,
                });
                toast[r.success ? "success" : "error"](r.message);
              })
            }
          >
            Update seats
          </Button>
        </div>
      ) : null}
      <div>
        <h3 className="mb-2 text-sm font-medium">Seat history</h3>
        {ledger.length === 0 ? (
          <p className="text-sm text-muted-foreground">No seat changes yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {ledger.map((row) => (
              <li
                key={row.id}
                className="flex justify-between gap-2 rounded-md border border-border px-3 py-2"
              >
                <span>
                  {row.change_type} · {row.seats_delta >= 0 ? "+" : ""}
                  {row.seats_delta} → {row.seats_after}
                  {row.note ? ` · ${row.note}` : ""}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(row.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
