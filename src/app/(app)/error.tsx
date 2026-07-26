"use client";

import { useEffect } from "react";

import { PageErrorState } from "@/components/layout/page-error-state";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

type AppErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppError({ error, reset }: AppErrorProps) {
  useEffect(() => {
    console.error("[app]", error);
  }, [error]);

  return (
    <PageErrorState
      description={toUserFacingError(
        error,
        "Deze pagina kon niet worden geladen. Probeer het opnieuw.",
      )}
      onRetry={reset}
      backHref="/dashboard"
      backLabel="Naar dashboard"
    />
  );
}
