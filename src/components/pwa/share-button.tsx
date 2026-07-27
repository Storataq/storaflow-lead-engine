"use client";

import { Share2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PWA_UI } from "@/lib/pwa/constants";
import { shareNative, type SharePayload } from "@/lib/pwa/share";

type Props = {
  payload: SharePayload;
  className?: string;
};

export function ShareButton({ payload, className }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className={className}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await shareNative(payload);
          if (result === "shared") toast.success(PWA_UI.shareNative);
          else if (result === "copied") toast.success(PWA_UI.shareCopied);
          else toast.error("Sharing not available");
        })
      }
    >
      <Share2 className="size-4" aria-hidden />
      <span className="ml-1.5">{PWA_UI.shareNative}</span>
    </Button>
  );
}
