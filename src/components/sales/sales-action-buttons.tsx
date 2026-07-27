"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import {
  analyzeSalesDealsAction,
  createEmailDraftAction,
  createFollowUpTaskAction,
  createMeetingBriefAction,
  refreshSalesBriefingAction,
  saveForecastSnapshotAction,
} from "@/lib/sales-agent/actions";
import { Button } from "@/components/ui/button";

export function SalesRefreshButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const r = await refreshSalesBriefingAction();
          if (r.success) toast.success(r.message);
          else toast.error(r.message);
        })
      }
    >
      {pending ? "Refreshing…" : "Refresh AI briefing"}
    </Button>
  );
}

export function SalesDealActions({ dealId }: { dealId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await analyzeSalesDealsAction([dealId]);
            if (r.success) toast.success(r.message);
            else toast.error(r.message);
          })
        }
      >
        Analyze
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await createFollowUpTaskAction({ dealId });
            if (r.success) toast.success(r.message);
            else toast.error(r.message);
          })
        }
      >
        Task
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await createEmailDraftAction({
              dealId,
              templateType: "follow_up",
            });
            if (r.success) toast.success(r.message);
            else toast.error(r.message);
          })
        }
      >
        Email
      </Button>
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await createMeetingBriefAction({ dealId });
            if (r.success) toast.success(r.message);
            else toast.error(r.message);
          })
        }
      >
        Meeting brief
      </Button>
    </div>
  );
}

export function SalesForecastSaveButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const r = await saveForecastSnapshotAction();
          if (r.success) toast.success(r.message);
          else toast.error(r.message);
        })
      }
    >
      {pending ? "Saving…" : "Save forecast snapshot"}
    </Button>
  );
}
