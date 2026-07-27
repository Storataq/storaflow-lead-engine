"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { approveAiRunAction } from "@/ai/actions";
import { Button } from "@/components/ui/button";

export function AiApprovalButtons({ approvalId }: { approvalId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await approveAiRunAction({
              approvalId,
              decision: "approved",
            });
            if (r.success) toast.success(r.message);
            else toast.error(r.message);
          })
        }
      >
        Approve
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await approveAiRunAction({
              approvalId,
              decision: "rejected",
            });
            if (r.success) toast.success(r.message);
            else toast.error(r.message);
          })
        }
      >
        Reject
      </Button>
    </div>
  );
}
