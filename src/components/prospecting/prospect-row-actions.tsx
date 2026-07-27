"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import {
  pushProspectToCrmAction,
  researchProspectAction,
} from "@/lib/prospecting/actions";
import { Button } from "@/components/ui/button";

export function ProspectRowActions({ prospectId }: { prospectId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await researchProspectAction(prospectId);
            if (r.success) toast.success(r.message);
            else toast.error(r.message);
          })
        }
      >
        Research
      </Button>
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await pushProspectToCrmAction({ prospectId });
            if (r.success) toast.success(r.message);
            else toast.error(r.message);
          })
        }
      >
        Add to CRM
      </Button>
    </div>
  );
}
