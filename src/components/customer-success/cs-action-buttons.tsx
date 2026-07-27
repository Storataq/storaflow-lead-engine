"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import {
  analyzeCustomersAction,
  applyRecommendationAction,
  createRenewalTasksAction,
} from "@/lib/customer-success/actions";
import { Button } from "@/components/ui/button";

export function CsAnalyzeButton({ companyIds }: { companyIds?: string[] }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const r = await analyzeCustomersAction(companyIds);
          if (r.success) toast.success(r.message);
          else toast.error(r.message);
        })
      }
    >
      {pending ? "Analyzing…" : companyIds?.length ? "Analyze" : "Refresh AI analysis"}
    </Button>
  );
}

export function CsRenewalTasksButton({ companyId }: { companyId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const r = await createRenewalTasksAction(companyId);
          if (r.success) toast.success(r.message);
          else toast.error(r.message);
        })
      }
    >
      {pending ? "Creating…" : "Renewal tasks"}
    </Button>
  );
}

export function CsApplyRecButton({ recommendationId }: { recommendationId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const r = await applyRecommendationAction(recommendationId);
          if (r.success) toast.success(r.message);
          else toast.error(r.message);
        })
      }
    >
      {pending ? "Applying…" : "Apply as task"}
    </Button>
  );
}
