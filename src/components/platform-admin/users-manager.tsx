"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { setUserControlAction } from "@/lib/platform-admin/actions";

type UserRow = {
  userId: string;
  email: string | null;
  fullName: string | null;
  role: string;
  organizationId: string;
  organizationName: string;
  status: string;
  lastLoginAt: string | null;
  country: string | null;
};

type Props = { users: UserRow[]; canManage: boolean };

export function UsersManager({ users, canManage }: Props) {
  const [pending, startTransition] = useTransition();

  if (users.length === 0) {
    return <p className="text-sm text-muted-foreground">No users found.</p>;
  }

  return (
    <ul className="space-y-2">
      {users.map((u) => (
        <li
          key={`${u.userId}-${u.organizationId}`}
          className="rounded-lg border border-border px-3 py-2 text-sm"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">
              {u.fullName ?? u.email ?? u.userId.slice(0, 8)}
            </span>
            <Badge variant="outline">{u.role}</Badge>
            <Badge variant="secondary">{u.status}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {u.email ?? "—"} · {u.organizationName}
            {u.country ? ` · ${u.country}` : ""}
          </p>
          {canManage ? (
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const r = await setUserControlAction({
                      userId: u.userId,
                      status: "suspended",
                      email: u.email ?? undefined,
                      fullName: u.fullName ?? undefined,
                    });
                    toast[r.success ? "success" : "error"](r.message);
                  })
                }
              >
                Suspend
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const r = await setUserControlAction({
                      userId: u.userId,
                      status: "active",
                    });
                    toast[r.success ? "success" : "error"](r.message);
                  })
                }
              >
                Unlock / reactivate
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const r = await setUserControlAction({
                      userId: u.userId,
                      forcePasswordReset: true,
                    });
                    toast[r.success ? "success" : "error"](r.message);
                  })
                }
              >
                Force password reset
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const r = await setUserControlAction({
                      userId: u.userId,
                      mfaDisabled: true,
                    });
                    toast[r.success ? "success" : "error"](r.message);
                  })
                }
              >
                Disable MFA
              </Button>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
