"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { completeMeetingSummaryAction } from "@/lib/sales-agent/actions";
import { Button } from "@/components/ui/button";

export function CompleteMeetingButton({ meetingId }: { meetingId: string }) {
  const [notes, setNotes] = useState(
    "Gesprek afgerond. Belangrijkste punten en afspraken vastgelegd door AI Sales Agent.",
  );
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Complete + CRM update
      </Button>
    );
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-2">
      <textarea
        className="min-h-20 rounded-md border border-input bg-transparent px-3 py-2 text-sm"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Meeting notes"
      />
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={pending || notes.trim().length < 3}
          onClick={() =>
            startTransition(async () => {
              const r = await completeMeetingSummaryAction({
                meetingBriefId: meetingId,
                notes: notes.trim(),
                createTasks: true,
              });
              if (r.success) {
                toast.success(r.message);
                setOpen(false);
              } else toast.error(r.message);
            })
          }
        >
          {pending ? "Saving…" : "Save summary"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
