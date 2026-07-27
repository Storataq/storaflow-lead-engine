"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { acknowledgeAlertAction } from "@/lib/security/actions";
import {
  SECURITY_ALERT_SEVERITY_LABELS,
  SECURITY_ALERT_TYPE_LABELS,
  SECURITY_UI,
  type SecurityAlertType,
} from "@/lib/security/constants";
import type { SecurityAlertRow } from "@/lib/security/types";
import { formatDateTime } from "@/lib/ui/format";

type Props = { alerts: SecurityAlertRow[]; canManage: boolean };

export function AlertsManager({ alerts, canManage }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      {alerts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {SECURITY_UI.emptyAlerts}
        </p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((a) => (
            <li
              key={a.id}
              className="rounded-lg border border-border px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap gap-2">
                <Badge>
                  {SECURITY_ALERT_TYPE_LABELS[a.alert_type as SecurityAlertType] ??
                    a.alert_type}
                </Badge>
                <Badge variant="outline">
                  {SECURITY_ALERT_SEVERITY_LABELS[
                    a.severity as keyof typeof SECURITY_ALERT_SEVERITY_LABELS
                  ] ?? a.severity}
                </Badge>
                <Badge variant="secondary">{a.status}</Badge>
              </div>
              <p className="mt-1 font-medium">{a.title}</p>
              {a.body ? (
                <p className="text-muted-foreground">{a.body}</p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                {formatDateTime(a.created_at)}
              </p>
              {canManage && a.status === "open" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="mt-2"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const r = await acknowledgeAlertAction(a.id);
                      toast[r.success ? "success" : "error"](r.message);
                    })
                  }
                >
                  Acknowledge
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
