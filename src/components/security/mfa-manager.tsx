"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { disableMfaAction, enableMfaAction } from "@/lib/security/actions";
import { SECURITY_UI } from "@/lib/security/constants";
import type { SecurityMfaRow } from "@/lib/security/types";
import { formatDateTime } from "@/lib/ui/format";

type Props = {
  mfa: SecurityMfaRow | null;
  forceMfa: boolean;
};

export function MfaManager({ mfa, forceMfa }: Props) {
  const [pending, startTransition] = useTransition();
  const [codes, setCodes] = useState<string[] | null>(null);
  const enabled = Boolean(mfa?.mfa_enabled);

  return (
    <div className="max-w-xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={enabled ? "default" : "secondary"}>
          {enabled ? "MFA on" : "MFA off"}
        </Badge>
        {forceMfa ? (
          <Badge variant="outline">Organization requires MFA</Badge>
        ) : null}
      </div>
      <p className="text-sm text-muted-foreground">
        Authenticator apps + recovery codes. {SECURITY_UI.futureSms}. Email
        backup ready. Trusted devices via Devices.
      </p>
      {mfa?.enabled_at ? (
        <p className="text-xs text-muted-foreground">
          Enabled {formatDateTime(mfa.enabled_at)}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {!enabled ? (
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await enableMfaAction();
                toast[r.success ? "success" : "error"](r.message);
                if (r.recoveryCodes) setCodes(r.recoveryCodes);
              })
            }
          >
            {SECURITY_UI.enableMfa}
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await disableMfaAction();
                toast[r.success ? "success" : "error"](r.message);
                setCodes(null);
              })
            }
          >
            {SECURITY_UI.disableMfa}
          </Button>
        )}
      </div>
      {codes ? (
        <div className="rounded-lg border border-border p-3 text-sm">
          <p className="font-medium">Recovery codes (store securely)</p>
          <ul className="mt-2 font-mono text-xs">
            {codes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
