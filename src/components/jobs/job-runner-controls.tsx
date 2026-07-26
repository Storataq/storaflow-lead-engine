"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  advanceMockScrapeAction,
  cancelScrapeAction,
  deleteScrapeAction,
  pauseScrapeAction,
  resumeScrapeAction,
  retryScrapeAction,
  startExistingJobAction,
} from "@/lib/jobs/actions";
import { normalizeJobStatus } from "@/lib/jobs/constants";
import type { ScrapeJobStatus } from "@/types/database";

type JobRunnerControlsProps = {
  jobId: string;
  status: ScrapeJobStatus;
};

export function JobRunnerControls({ jobId, status }: JobRunnerControlsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const advancingRef = useRef(false);
  const normalized = normalizeJobStatus(status);
  const isProcessing =
    normalized === "queued" ||
    normalized === "active" ||
    normalized === "pending";

  useEffect(() => {
    if (!isProcessing) return;

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
          }, 650);
        } else if (result.done && result.status === "completed") {
          toast.success(result.message);
        }
      } finally {
        advancingRef.current = false;
      }
    }

    timer = setTimeout(() => {
      void tick();
    }, 350);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [jobId, isProcessing, router]);

  async function run(
    action: (
      id: string,
    ) => Promise<{ success: boolean; message: string; jobId?: string }>,
    options?: { afterDelete?: boolean },
  ) {
    const result = await action(jobId);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message);
    if (options?.afterDelete) {
      startTransition(() => {
        router.push("/jobs");
        router.refresh();
      });
      return;
    }
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
      {isProcessing ? (
        <p className="mr-2 text-sm text-muted-foreground">
          Queue / MockWorker actief…
        </p>
      ) : null}

      {normalized === "draft" || normalized === "pending" ? (
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => {
            void run(startExistingJobAction);
          }}
        >
          Start
        </Button>
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

      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Job definitief verwijderen?")) return;
          void run(deleteScrapeAction, { afterDelete: true });
        }}
      >
        Delete
      </Button>
    </div>
  );
}
