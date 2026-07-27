"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  revokeDeviceAction,
  trustDeviceAction,
} from "@/lib/security/actions";
import { SECURITY_UI } from "@/lib/security/constants";
import type { SecurityDeviceRow } from "@/lib/security/types";
import { formatDateTime } from "@/lib/ui/format";

type Props = { devices: SecurityDeviceRow[] };

export function DevicesManager({ devices }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      {devices.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {SECURITY_UI.emptyDevices}
        </p>
      ) : (
        <ul className="space-y-2">
          {devices.map((d) => (
            <li
              key={d.id}
              className="rounded-lg border border-border px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{d.device_name}</p>
                <Badge variant={d.is_trusted ? "default" : "secondary"}>
                  {d.is_trusted ? "Trusted" : "Untrusted"}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {d.browser} · {d.platform}
              </p>
              <p className="text-xs text-muted-foreground">
                First {formatDateTime(d.first_seen_at)} · Last{" "}
                {formatDateTime(d.last_used_at)}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {!d.is_trusted ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const r = await trustDeviceAction(d.id);
                        toast[r.success ? "success" : "error"](r.message);
                      })
                    }
                  >
                    Trust
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const r = await revokeDeviceAction(d.id);
                      toast[r.success ? "success" : "error"](r.message);
                    })
                  }
                >
                  {SECURITY_UI.revokeDevice}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
