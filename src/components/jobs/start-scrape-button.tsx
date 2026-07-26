"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Play } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { startScrapeAction } from "@/lib/jobs/actions";

type StartScrapeButtonProps = {
  searchQueryId: string;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm";
  className?: string;
};

export function StartScrapeButton({
  searchQueryId,
  variant = "default",
  size = "default",
  className,
}: StartScrapeButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  async function handleStart() {
    if (busy || pending) return;
    setBusy(true);
    try {
      const result = await startScrapeAction(searchQueryId);

      if (!result.success || !result.jobId) {
        toast.error(result.message);
        return;
      }

      if (result.message.includes("al een actieve scrape")) {
        toast.message(result.message);
      } else {
        toast.success(result.message);
      }
      startTransition(() => {
        router.push(`/jobs/${result.jobId}`);
        router.refresh();
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={busy || pending}
      onClick={() => {
        void handleStart();
      }}
    >
      <Play className="size-4" />
      {busy || pending ? "Starten…" : "Start scrape"}
    </Button>
  );
}
