"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { endImpersonationAction } from "@/lib/platform-admin/actions";
import {
  IMPERSONATION_MODE_LABELS,
  IMPERSONATION_MODES,
  PLATFORM_UI,
} from "@/lib/platform-admin/constants";

type Props = {
  organizationName: string;
  mode: string;
  reason: string;
};

export function ImpersonationBanner({
  organizationName,
  mode,
  reason,
}: Props) {
  const [pending, startTransition] = useTransition();
  const modeLabel =
    IMPERSONATION_MODE_LABELS[mode as (typeof IMPERSONATION_MODES)[number]] ??
    mode;

  return (
    <div
      role="status"
      className="border-b border-amber-500/40 bg-amber-500/15 px-4 py-2 text-sm text-amber-950 dark:text-amber-100"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
        <p>
          {PLATFORM_UI.impersonationBanner}{" "}
          <strong>{organizationName}</strong> · {modeLabel} · {reason}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await endImpersonationAction();
              toast[r.success ? "success" : "error"](r.message);
            })
          }
        >
          End impersonation
        </Button>
      </div>
    </div>
  );
}
