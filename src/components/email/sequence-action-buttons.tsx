"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  archiveEmailSequenceAction,
  duplicateEmailSequenceAction,
  publishEmailSequenceAction,
  restoreEmailSequenceAction,
  validateEmailSequenceAction,
} from "@/lib/email/sequence/actions";

export function SequenceDuplicateButton({ sequenceId }: { sequenceId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await duplicateEmailSequenceAction(sequenceId);
          if (!result.success) {
            toast.error(result.message);
            return;
          }
          toast.success(result.message);
          if (result.id) {
            router.push(`/email/sequences/${result.id}/edit`);
            router.refresh();
          }
        });
      }}
    >
      {pending ? "Duplicating…" : "Duplicate"}
    </Button>
  );
}

export function SequenceArchiveButton({ sequenceId }: { sequenceId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await archiveEmailSequenceAction(sequenceId);
          if (!result.success) {
            toast.error(result.message);
            return;
          }
          toast.success(result.message);
          router.refresh();
        });
      }}
    >
      {pending ? "Archiving…" : "Archive"}
    </Button>
  );
}

export function SequenceRestoreButton({ sequenceId }: { sequenceId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await restoreEmailSequenceAction(sequenceId);
          if (!result.success) {
            toast.error(result.message);
            return;
          }
          toast.success(result.message);
          router.refresh();
        });
      }}
    >
      {pending ? "Restoring…" : "Restore to draft"}
    </Button>
  );
}

export function SequenceValidateButton({ sequenceId }: { sequenceId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await validateEmailSequenceAction(sequenceId);
          if (!result.success) {
            toast.error(result.message);
            return;
          }
          toast.success(result.message);
          router.refresh();
        });
      }}
    >
      {pending ? "Validating…" : "Validate"}
    </Button>
  );
}

export function SequencePublishButton({ sequenceId }: { sequenceId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const formData = new FormData();
          formData.set("change_notes", "Published from sequence detail");
          const result = await publishEmailSequenceAction(sequenceId, formData);
          if (!result.success) {
            toast.error(result.message);
            return;
          }
          toast.success(result.message);
          router.refresh();
        });
      }}
    >
      {pending ? "Publishing…" : "Publish"}
    </Button>
  );
}
