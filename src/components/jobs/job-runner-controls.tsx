"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { advanceMockScrapeAction, pauseScrapeAction } from "@/lib/jobs/actions";
import type { ScrapeJobStatus } from "@/types/database";

type JobRunnerControlsProps = {
  jobId: string;
  status: ScrapeJobStatus;
};

export function JobRunnerControls({ jobId, status }: JobRunnerControlsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const advancingRef = useRef(false);
  const isOpen = status === "queued" || status === "running";

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

  async function handlePause() {
    const result = await pauseScrapeAction(jobId);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message);
    startTransition(() => {
      router.refresh();
    });
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="text-sm text-muted-foreground">
        Mock-engine verwerkt pagina&apos;s…
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          void handlePause();
        }}
      >
        Pauzeren
      </Button>
    </div>
  );
}
