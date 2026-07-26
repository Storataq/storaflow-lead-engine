"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  advanceMockScrapeAction,
  cancelScrapeAction,
  pauseScrapeAction,
  resumeScrapeAction,
  retryScrapeAction,
} from "@/lib/jobs/actions";
import { normalizeJobStatus } from "@/lib/jobs/constants";
import type { ScrapeJobStatus } from "@/types/database";

type JobRunnerControlsProps = {
  jobId: string;
  status: ScrapeJobStatus;
  /** When true, also show Start is handled elsewhere — this is lifecycle controls */
  showAdvanceHint?: boolean;
};

export function JobRunnerControls({
  jobId,
  status,
}: JobRunnerControlsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const advancingRef = useRef(false);
  const normalized = normalizeJobStatus(status);
  const isOpen = normalized === "pending" || normalized === "queued" || normalized === "active";

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function tick() {
      if (cancelled || advancingRef.current) return;
      advancingRef.current = true;
      try {
        const result = await advanceMockScrapeAction(jobId);
        if (!result.success) {
          toast.error(result.message);
          startTransition(() => router.refresh());
          return;
        }
        startTransition(() => {
          router.refresh();
        });
        if (!result.done && !cancelled) {
          timer = setTimeout(() => {
            void tick();
          }, 700);
        } else if (result.done && result.status === "completed") {
          toast.success(result.message);
        }
      } finally {
        advancingRef.current = false;
      }
    }

    timer = setTimeout(() => {
      void tick();
    }, 400);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [jobId, isOpen, router]);

  async function run(
    action: (id: string) => Promise<{ success: boolean; message: string; jobId?: string }>,
  ) {
    const result = await action(jobId);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message);
    if (result.jobId && result.jobId !== jobId) {
      startTransition(() => {
        router.push(`/jobs/${result.jobId}`);
        router.refresh();
      });
      return;
    }
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isOpen ? (
        <p className="mr-2 text-sm text-muted-foreground">
          Mock-engine verwerkt…
        </p>
      ) : null}

      {normalized === "pending" ||
      normalized === "queued" ||
      normalized === "active" ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => {
            void run(pauseScrapeAction);
          }}
        >
          Pause
        </Button>
      ) : null}

      {normalized === "paused" ? (
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => {
            void run(resumeScrapeAction);
          }}
        >
          Resume
        </Button>
      ) : null}

      {!["completed", "cancelled", "failed"].includes(normalized) ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => {
            void run(cancelScrapeAction);
          }}
        >
          Cancel
        </Button>
      ) : null}

      {["failed", "cancelled", "paused", "completed"].includes(normalized) ? (
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => {
            void run(retryScrapeAction);
          }}
        >
          Retry
        </Button>
      ) : null}
    </div>
  );
}
