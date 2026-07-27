"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveSecurityPoliciesAction } from "@/lib/security/actions";
import type { SecurityPolicyRow } from "@/lib/security/types";
import { DEFAULT_SECURITY_POLICY } from "@/lib/security/types";

type Props = {
  policy: SecurityPolicyRow | null;
  canManage: boolean;
};

export function PoliciesManager({ policy, canManage }: Props) {
  const [pending, startTransition] = useTransition();
  const base = policy ?? {
    ...DEFAULT_SECURITY_POLICY,
    organization_id: "",
    allowed_login_hours_json: {},
    allowed_countries_json: [],
    updated_by: null,
    created_at: "",
    updated_at: "",
  };

  const [forceMfa, setForceMfa] = useState(base.force_mfa);
  const [sessionTimeout, setSessionTimeout] = useState(
    base.session_timeout_minutes,
  );
  const [idleTimeout, setIdleTimeout] = useState(base.idle_timeout_minutes);
  const [maxSessions, setMaxSessions] = useState(base.max_sessions);
  const [minLength, setMinLength] = useState(base.password_min_length);
  const [requireUpper, setRequireUpper] = useState(base.password_require_upper);
  const [requireLower, setRequireLower] = useState(base.password_require_lower);
  const [requireNumber, setRequireNumber] = useState(
    base.password_require_number,
  );
  const [requireSymbol, setRequireSymbol] = useState(
    base.password_require_symbol,
  );
  const [failedThreshold, setFailedThreshold] = useState(
    base.failed_login_threshold,
  );
  const [lockout, setLockout] = useState(base.lockout_minutes);
  const [ipCidrs, setIpCidrs] = useState(
    Array.isArray(base.allowed_ip_cidrs)
      ? (base.allowed_ip_cidrs as string[]).join(", ")
      : "",
  );
  const [allowMagicLink, setAllowMagicLink] = useState(base.allow_magic_link);
  const [allowPasskeys, setAllowPasskeys] = useState(base.allow_passkeys);
  const [allowOauth, setAllowOauth] = useState(base.allow_oauth);
  const [allowPasswordless, setAllowPasswordless] = useState(
    base.allow_passwordless,
  );

  if (!canManage) {
    return (
      <p className="text-sm text-muted-foreground">
        View only — owners and admins edit access policies.
      </p>
    );
  }

  return (
    <form
      className="grid max-w-2xl gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const r = await saveSecurityPoliciesAction({
            forceMfa,
            sessionTimeoutMinutes: sessionTimeout,
            idleTimeoutMinutes: idleTimeout,
            maxSessions,
            passwordMinLength: minLength,
            passwordRequireUpper: requireUpper,
            passwordRequireLower: requireLower,
            passwordRequireNumber: requireNumber,
            passwordRequireSymbol: requireSymbol,
            failedLoginThreshold: failedThreshold,
            lockoutMinutes: lockout,
            allowedIpCidrs: ipCidrs
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            allowMagicLink,
            allowPasskeys,
            allowOauth,
            allowPasswordless,
          });
          toast[r.success ? "success" : "error"](r.message);
        });
      }}
    >
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={forceMfa}
          onChange={(e) => setForceMfa(e.target.checked)}
        />
        Force MFA for organization
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={allowMagicLink}
          onChange={(e) => setAllowMagicLink(e.target.checked)}
        />
        Magic link ready
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={allowPasskeys}
          onChange={(e) => setAllowPasskeys(e.target.checked)}
        />
        Passkeys ready
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={allowOauth}
          onChange={(e) => setAllowOauth(e.target.checked)}
        />
        OAuth ready
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={allowPasswordless}
          onChange={(e) => setAllowPasswordless(e.target.checked)}
        />
        Passwordless ready
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-sm">
          Session timeout (minutes)
          <Input
            type="number"
            value={sessionTimeout}
            onChange={(e) => setSessionTimeout(Number(e.target.value))}
          />
        </label>
        <label className="text-sm">
          Idle timeout (minutes)
          <Input
            type="number"
            value={idleTimeout}
            onChange={(e) => setIdleTimeout(Number(e.target.value))}
          />
        </label>
        <label className="text-sm">
          Max sessions
          <Input
            type="number"
            value={maxSessions}
            onChange={(e) => setMaxSessions(Number(e.target.value))}
          />
        </label>
        <label className="text-sm">
          Password min length
          <Input
            type="number"
            value={minLength}
            onChange={(e) => setMinLength(Number(e.target.value))}
          />
        </label>
        <label className="text-sm">
          Failed login threshold
          <Input
            type="number"
            value={failedThreshold}
            onChange={(e) => setFailedThreshold(Number(e.target.value))}
          />
        </label>
        <label className="text-sm">
          Lockout (minutes)
          <Input
            type="number"
            value={lockout}
            onChange={(e) => setLockout(Number(e.target.value))}
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={requireUpper}
          onChange={(e) => setRequireUpper(e.target.checked)}
        />
        Require uppercase
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={requireLower}
          onChange={(e) => setRequireLower(e.target.checked)}
        />
        Require lowercase
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={requireNumber}
          onChange={(e) => setRequireNumber(e.target.checked)}
        />
        Require number
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={requireSymbol}
          onChange={(e) => setRequireSymbol(e.target.checked)}
        />
        Require symbol
      </label>
      <label className="text-sm">
        Allowed IP ranges (comma-separated, future CIDR)
        <Input
          value={ipCidrs}
          onChange={(e) => setIpCidrs(e.target.value)}
          placeholder="203.0.113.0, 198.51.100.10"
        />
      </label>
      <Button type="submit" disabled={pending}>
        Save policies
      </Button>
    </form>
  );
}
