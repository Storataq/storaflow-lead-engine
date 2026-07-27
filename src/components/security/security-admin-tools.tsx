"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  adminResetUserMfaAction,
  lockUserAccountAction,
  unlockUserAccountAction,
} from "@/lib/security/actions";
import { SECURITY_UI } from "@/lib/security/constants";

type Props = {
  members: Array<{ userId: string; label: string }>;
  canManage: boolean;
};

export function SecurityAdminTools({ members, canManage }: Props) {
  const [pending, startTransition] = useTransition();
  const [userId, setUserId] = useState(members[0]?.userId ?? "");
  const [reason, setReason] = useState("");

  if (!canManage) {
    return (
      <p className="text-sm text-muted-foreground">
        Admin tools require owner or admin role.
      </p>
    );
  }

  return (
    <div className="max-w-xl space-y-4 rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold">{SECURITY_UI.adminTitle}</h3>
      <p className="text-xs text-muted-foreground">
        Reset MFA, force logout (via lock), disable/unlock accounts, review
        security events.
      </p>
      <select
        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        aria-label="User"
      >
        {members.map((m) => (
          <option key={m.userId} value={m.userId}>
            {m.label}
          </option>
        ))}
      </select>
      <Input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Lock reason"
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={pending || !userId}
          onClick={() =>
            startTransition(async () => {
              const r = await adminResetUserMfaAction(userId);
              toast[r.success ? "success" : "error"](r.message);
            })
          }
        >
          Reset MFA
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending || !userId}
          onClick={() =>
            startTransition(async () => {
              const r = await lockUserAccountAction({ userId, reason });
              toast[r.success ? "success" : "error"](r.message);
            })
          }
        >
          {SECURITY_UI.forceLogout} / Lock
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={pending || !userId}
          onClick={() =>
            startTransition(async () => {
              const r = await unlockUserAccountAction(userId);
              toast[r.success ? "success" : "error"](r.message);
            })
          }
        >
          Unlock
        </Button>
      </div>
    </div>
  );
}
