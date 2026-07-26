"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createLeadFromCompanyAction } from "@/lib/crm/actions";

type ConvertCompanyToLeadButtonProps = {
  companyId: string;
};

export function ConvertCompanyToLeadButton({
  companyId,
}: ConvertCompanyToLeadButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await createLeadFromCompanyAction(companyId);
          if (!result.success) {
            toast.error(result.message);
            return;
          }
          toast.success(result.message);
          if (result.id) {
            router.push(`/crm/leads/${result.id}`);
            router.refresh();
          }
        });
      }}
    >
      {pending ? "Bezig…" : "Als lead toevoegen"}
    </Button>
  );
}
