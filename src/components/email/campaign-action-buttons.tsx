"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  approveEmailCampaignAction,
  archiveEmailCampaignAction,
  createRecipientSnapshotAction,
  duplicateEmailCampaignAction,
  rejectEmailCampaignAction,
  restoreEmailCampaignAction,
  returnCampaignToDraftAction,
  submitCampaignForReviewAction,
  validateEmailCampaignAction,
} from "@/lib/email/campaign/actions";
import { startCampaignExecutionAction } from "@/lib/email/execution/actions";

export function CampaignValidateButton({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await validateEmailCampaignAction(campaignId);
          if (!result.success) toast.error(result.message);
          else toast.success(result.message);
          router.refresh();
        });
      }}
    >
      {pending ? "Validating…" : "Run validation"}
    </Button>
  );
}

export function CampaignSnapshotButton({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await createRecipientSnapshotAction(campaignId);
          if (!result.success) toast.error(result.message);
          else toast.success(result.message);
          router.refresh();
        });
      }}
    >
      {pending ? "Snapshotting…" : "Build recipient snapshot"}
    </Button>
  );
}

export function CampaignSubmitReviewButton({
  campaignId,
}: {
  campaignId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await submitCampaignForReviewAction(campaignId);
          if (!result.success) toast.error(result.message);
          else toast.success(result.message);
          router.refresh();
        });
      }}
    >
      {pending ? "Submitting…" : "Submit for review"}
    </Button>
  );
}

export function CampaignApproveForm({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const result = await approveEmailCampaignAction(campaignId, fd);
          if (!result.success) toast.error(result.message);
          else toast.success(result.message);
          router.refresh();
        });
      }}
    >
      <input
        name="notes"
        placeholder="Approval notes"
        className="flex h-8 min-w-[180px] rounded-lg border border-input bg-transparent px-2.5 text-sm"
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Approving…" : "Approve (no send)"}
      </Button>
    </form>
  );
}

export function CampaignRejectForm({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const result = await rejectEmailCampaignAction(campaignId, fd);
          if (!result.success) toast.error(result.message);
          else toast.success(result.message);
          router.refresh();
        });
      }}
    >
      <select
        name="decision"
        className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
        defaultValue="changes_required"
      >
        <option value="changes_required">Changes required</option>
        <option value="rejected">Rejected</option>
      </select>
      <input
        name="reason"
        placeholder="Reason"
        className="flex h-8 min-w-[180px] rounded-lg border border-input bg-transparent px-2.5 text-sm"
      />
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Saving…" : "Reject / request changes"}
      </Button>
    </form>
  );
}

export function CampaignReturnDraftButton({
  campaignId,
}: {
  campaignId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() => {
        if (
          !window.confirm(
            "Return to Draft? This invalidates approval and unlocks the campaign.",
          )
        ) {
          return;
        }
        startTransition(async () => {
          const result = await returnCampaignToDraftAction(campaignId);
          if (!result.success) toast.error(result.message);
          else toast.success(result.message);
          router.refresh();
        });
      }}
    >
      {pending ? "Unlocking…" : "Return to Draft"}
    </Button>
  );
}

export function CampaignStartExecutionButton({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() => {
        if (
          !window.confirm(
            "Start internal sequence execution? No external emails will be sent in this phase.",
          )
        ) {
          return;
        }
        startTransition(async () => {
          const result = await startCampaignExecutionAction({ campaignId });
          if (!result.success) {
            toast.error(result.message);
            return;
          }
          toast.success(result.message);
          if (result.id) router.push(`/email/executions/${result.id}`);
          router.refresh();
        });
      }}
    >
      {pending ? "Starting…" : "Start execution"}
    </Button>
  );
}

export function CampaignDuplicateButton({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await duplicateEmailCampaignAction(campaignId);
          if (!result.success) toast.error(result.message);
          else {
            toast.success(result.message);
            if (result.id) router.push(`/email/campaigns/${result.id}`);
          }
          router.refresh();
        });
      }}
    >
      {pending ? "Duplicating…" : "Duplicate"}
    </Button>
  );
}

export function CampaignArchiveButton({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await archiveEmailCampaignAction(campaignId);
          if (!result.success) toast.error(result.message);
          else toast.success(result.message);
          router.refresh();
        });
      }}
    >
      {pending ? "Archiving…" : "Archive"}
    </Button>
  );
}

export function CampaignRestoreButton({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await restoreEmailCampaignAction(campaignId);
          if (!result.success) toast.error(result.message);
          else toast.success(result.message);
          router.refresh();
        });
      }}
    >
      {pending ? "Restoring…" : "Restore to Draft"}
    </Button>
  );
}
