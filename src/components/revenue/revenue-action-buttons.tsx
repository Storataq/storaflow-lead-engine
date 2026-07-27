"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import {
  generateReportsAction,
  refreshRevenueAction,
  runScenarioAction,
} from "@/lib/revenue-intelligence/actions";
import {
  SCENARIO_TYPES,
  SCENARIO_TYPE_LABELS,
  type ScenarioType,
} from "@/lib/revenue-intelligence/constants";
import { Button } from "@/components/ui/button";

export function RevenueRefreshButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const r = await refreshRevenueAction();
          if (r.success) toast.success(r.message);
          else toast.error(r.message);
        })
      }
    >
      {pending ? "Refreshing…" : "Refresh AI revenue"}
    </Button>
  );
}

export function RevenueReportsButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const r = await generateReportsAction();
          if (r.success) toast.success(r.message);
          else toast.error(r.message);
        })
      }
    >
      {pending ? "Generating…" : "Generate reports"}
    </Button>
  );
}

export function RevenueScenarioButtons() {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-wrap gap-2">
      {SCENARIO_TYPES.filter((t) => t !== "custom").map((type) => (
        <Button
          key={type}
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await runScenarioAction(type as ScenarioType);
              if (r.success) toast.success(r.message);
              else toast.error(r.message);
            })
          }
        >
          {SCENARIO_TYPE_LABELS[type]}
        </Button>
      ))}
    </div>
  );
}
