"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  setOrganizationLifecycleAction,
  startImpersonationAction,
  transferOwnershipAction,
} from "@/lib/platform-admin/actions";
import {
  ORG_LIFECYCLE_LABELS,
  type OrgLifecycleStatus,
} from "@/lib/platform-admin/constants";
import type { OrgListItem } from "@/lib/platform-admin/types";
import { formatDateTime } from "@/lib/ui/format";
import Link from "next/link";

type Props = {
  organizations: OrgListItem[];
  canManage: boolean;
  canImpersonate: boolean;
};

export function OrganizationsManager({
  organizations,
  canManage,
  canImpersonate,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState("");

  if (organizations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No organizations found.</p>
    );
  }

  return (
    <div className="space-y-3">
      {canImpersonate ? (
        <div className="flex max-w-md items-end gap-2">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground" htmlFor="imp-reason">
              Impersonation reason
            </label>
            <Input
              id="imp-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Support ticket #"
            />
          </div>
        </div>
      ) : null}
      <ul className="space-y-2">
        {organizations.map((org) => (
          <li
            key={org.id}
            className="rounded-lg border border-border px-3 py-3 text-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <Link
                  href={`/platform-admin/organizations/${org.id}`}
                  className="font-medium hover:underline"
                >
                  {org.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {org.slug} · {org.memberCount} users ·{" "}
                  {org.planName ?? "No plan"} ·{" "}
                  {org.subscriptionStatus ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Created {formatDateTime(org.created_at)}
                  {org.country ? ` · ${org.country}` : ""}
                </p>
              </div>
              <Badge variant="outline">
                {ORG_LIFECYCLE_LABELS[
                  org.lifecycle_status as OrgLifecycleStatus
                ] ?? org.lifecycle_status}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {canManage ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const r = await setOrganizationLifecycleAction({
                          organizationId: org.id,
                          status: "suspended",
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
                        const r = await setOrganizationLifecycleAction({
                          organizationId: org.id,
                          status: "active",
                        });
                        toast[r.success ? "success" : "error"](r.message);
                      })
                    }
                  >
                    Reactivate
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const r = await setOrganizationLifecycleAction({
                          organizationId: org.id,
                          status: "archived",
                        });
                        toast[r.success ? "success" : "error"](r.message);
                      })
                    }
                  >
                    Archive
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const r = await setOrganizationLifecycleAction({
                          organizationId: org.id,
                          status: "deleted",
                        });
                        toast[r.success ? "success" : "error"](r.message);
                      })
                    }
                  >
                    Soft delete
                  </Button>
                </>
              ) : null}
              {canImpersonate ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={pending || !reason.trim()}
                  onClick={() =>
                    startTransition(async () => {
                      const r = await startImpersonationAction({
                        organizationId: org.id,
                        mode: "read_only",
                        reason,
                      });
                      toast[r.success ? "success" : "error"](r.message);
                    })
                  }
                >
                  Impersonate (read-only)
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TransferOwnershipButton({
  organizationId,
  newOwnerUserId,
}: {
  organizationId: string;
  newOwnerUserId: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const r = await transferOwnershipAction({
            organizationId,
            newOwnerUserId,
          });
          toast[r.success ? "success" : "error"](r.message);
        })
      }
    >
      Make owner
    </Button>
  );
}
