"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createManualSuppressionAction,
  removeEligibleSuppressionAction,
} from "@/lib/email/preferences/admin-actions";
import type { SuppressionListRow } from "@/lib/email/preferences/queries";
import { MANDATORY_SUPPRESSION_REASONS } from "@/lib/email/preferences/constants";

export function SuppressionsManager({
  rows,
  canManage,
}: {
  rows: SuppressionListRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      {canManage ? (
        <form
          className="grid gap-3 rounded-lg border p-4 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const result = await createManualSuppressionAction(fd);
              if (!result.success) toast.error(result.message);
              else {
                toast.success(result.message);
                e.currentTarget.reset();
                router.refresh();
              }
            });
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="reason">Reason</Label>
            <select
              id="reason"
              name="reason"
              required
              className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
              defaultValue="manual"
            >
              <option value="manual">Manual</option>
              <option value="do_not_contact">Do not contact</option>
              <option value="unsubscribed">Unsubscribed</option>
              <option value="invalid_email">Invalid email</option>
              <option value="legal_restriction">Legal restriction</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="scope">Scope</Label>
            <select
              id="scope"
              name="scope"
              className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
              defaultValue="organization"
            >
              <option value="organization">Organization</option>
              <option value="category">Category</option>
              <option value="campaign">Campaign</option>
              <option value="legal">Legal</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="expires_at">Expires at (optional)</Label>
            <Input id="expires_at" name="expires_at" type="datetime-local" />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Add manual suppression"}
            </Button>
          </div>
        </form>
      ) : null}

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Permanent</TableHead>
              <TableHead>Created</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground">
                  No suppressions yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs">
                    {row.emailNormalized}
                  </TableCell>
                  <TableCell>{row.active ? row.status : "inactive"}</TableCell>
                  <TableCell>{row.reason}</TableCell>
                  <TableCell>{row.source ?? "—"}</TableCell>
                  <TableCell>{row.scope}</TableCell>
                  <TableCell>{row.permanentFlag ? "yes" : "no"}</TableCell>
                  <TableCell>
                    {new Date(row.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {canManage &&
                    row.active &&
                    !MANDATORY_SUPPRESSION_REASONS.has(row.reason) ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => {
                          const fd = new FormData();
                          fd.set("suppression_id", row.id);
                          fd.set("removal_reason", "admin_removed");
                          startTransition(async () => {
                            const result =
                              await removeEligibleSuppressionAction(fd);
                            if (!result.success) toast.error(result.message);
                            else {
                              toast.success(result.message);
                              router.refresh();
                            }
                          });
                        }}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
