"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { markBillingNotificationReadAction } from "@/lib/billing/actions";
import {
  BILLING_NOTIFICATION_TYPE_LABELS,
  BILLING_NOTIFICATION_TYPES,
} from "@/lib/billing/constants";
import type { BillingNotificationRow } from "@/lib/billing/types";
import { formatDateTime } from "@/lib/ui/format";

type NotifType = (typeof BILLING_NOTIFICATION_TYPES)[number];

type Props = { notifications: BillingNotificationRow[] };

export function BillingNotificationsList({ notifications }: Props) {
  const [pending, startTransition] = useTransition();

  if (notifications.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No billing notifications.</p>
    );
  }

  return (
    <ul className="space-y-2">
      {notifications.map((n) => (
        <li
          key={n.id}
          className="rounded-lg border border-border px-3 py-2 text-sm"
        >
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              {BILLING_NOTIFICATION_TYPE_LABELS[n.notification_type as NotifType] ??
                n.notification_type}
            </Badge>
            {n.is_read ? null : <Badge>New</Badge>}
          </div>
          <p className="mt-1 font-medium">{n.title}</p>
          {n.body ? <p className="text-muted-foreground">{n.body}</p> : null}
          <p className="text-xs text-muted-foreground">
            {formatDateTime(n.created_at)}
          </p>
          {!n.is_read ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="mt-1"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await markBillingNotificationReadAction(n.id);
                  toast[r.success ? "success" : "error"](r.message);
                })
              }
            >
              Mark read
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
