"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type InlineErrorAlertProps = {
  title?: string;
  description: string;
  onRetry?: () => void;
};

/**
 * Page-inline error with optional retry. Use with `toUserFacingError` messages.
 */
export function InlineErrorAlert({
  title = "Kon gegevens niet laden",
  description,
  onRetry,
}: InlineErrorAlertProps) {
  return (
    <Alert variant="destructive" role="alert">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-pretty">{description}</span>
        {onRetry ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="shrink-0 border-destructive/40 bg-background"
            onClick={onRetry}
          >
            Opnieuw proberen
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
