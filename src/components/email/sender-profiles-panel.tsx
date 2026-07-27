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
import { createSenderProfileAction } from "@/lib/email/campaign/actions";
import type { EmailSenderProfileRow } from "@/lib/email/campaign/queries";

export function SenderProfilesPanel({
  profiles,
}: {
  profiles: EmailSenderProfileRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <form
        className="grid gap-3 rounded-lg border p-4 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(async () => {
            const result = await createSenderProfileAction(fd);
            if (!result.success) toast.error(result.message);
            else {
              toast.success(result.message);
              e.currentTarget.reset();
              router.refresh();
            }
          });
        }}
      >
        <p className="md:col-span-2 text-sm text-muted-foreground">
          Sender profiles can now be used for live provider dispatch. Domain
          verification status still depends on provider-side setup and manual
          verification flow.
        </p>
        <div className="space-y-1">
          <Label htmlFor="sp-name">Profile name</Label>
          <Input id="sp-name" name="name" required placeholder="Default sales" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="sp-sender-name">Sender name</Label>
          <Input id="sp-sender-name" name="sender_name" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="sp-sender-email">Sender email</Label>
          <Input
            id="sp-sender-email"
            name="sender_email"
            type="email"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="sp-reply-email">Reply-To email</Label>
          <Input id="sp-reply-email" name="reply_to_email" type="email" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="sp-reply-name">Reply-To name</Label>
          <Input id="sp-reply-name" name="reply_to_name" />
        </div>
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input type="checkbox" name="is_default" />
          Default profile
        </label>
        <div className="md:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Add sender profile"}
          </Button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>From</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Domain</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  No sender profiles yet.
                </TableCell>
              </TableRow>
            ) : (
              profiles.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {p.name}
                    {p.is_default ? " (default)" : ""}
                  </TableCell>
                  <TableCell>
                    {p.sender_name} &lt;{p.sender_email}&gt;
                  </TableCell>
                  <TableCell>{p.status}</TableCell>
                  <TableCell>{p.domain_verification_status}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
