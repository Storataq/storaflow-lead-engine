"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  archiveEmailTemplateAction,
  duplicateEmailTemplateAction,
  restoreTemplateVersionAction,
} from "@/lib/email/template/actions";

export function TemplateDuplicateButton({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await duplicateEmailTemplateAction(templateId);
          if (!result.success) {
            toast.error(result.message);
            return;
          }
          toast.success(result.message);
          if (result.id) {
            router.push(`/email/templates/${result.id}/edit`);
            router.refresh();
          }
        });
      }}
    >
      {pending ? "Duplicating…" : "Duplicate"}
    </Button>
  );
}

export function TemplateArchiveButton({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await archiveEmailTemplateAction(templateId);
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

export function TemplateRestoreVersionButton({
  templateId,
  versionNumber,
}: {
  templateId: string;
  versionNumber: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await restoreTemplateVersionAction(
            templateId,
            versionNumber,
          );
          if (!result.success) {
            toast.error(result.message);
            return;
          }
          toast.success(result.message);
          router.push(`/email/templates/${templateId}/edit`);
          router.refresh();
        });
      }}
    >
      {pending ? "Restoring…" : "Restore as draft"}
    </Button>
  );
}
