"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  terminateOtherSessionsAction,
  terminateSessionAction,
} from "@/lib/security/actions";
import { SECURITY_UI } from "@/lib/security/constants";
import type { SecuritySessionRow } from "@/lib/security/types";
import { formatDateTime } from "@/lib/ui/format";

type Props = { sessions: SecuritySessionRow[]; canManageOrg?: boolean };

export function SessionsManager({ sessions }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await terminateOtherSessionsAction();
            toast[r.success ? "success" : "error"](r.message);
          })
        }
      >
        {SECURITY_UI.terminateOthers}
      </Button>
      {sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {SECURITY_UI.emptySessions}
        </p>
      ) : (
        <ul className="space-y-2">
          {sessions.map((s) => (
            <li
              key={s.id}
              className="rounded-lg border border-border px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">
                  {s.device_name ?? "Session"}
                </p>
                {s.is_current ? <Badge>Current</Badge> : null}
              </div>
              <p className="mt-1 text-muted-foreground">
                {s.browser} · {s.operating_system} · {s.ip_address ?? "—"}
                {s.country_code ? ` · ${s.country_code}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                Login {formatDateTime(s.login_at)} · Last activity{" "}
                {formatDateTime(s.last_activity_at)}
              </p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="mt-2"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const r = await terminateSessionAction(s.id);
                    toast[r.success ? "success" : "error"](r.message);
                  })
                }
              >
                {SECURITY_UI.terminateSession}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
