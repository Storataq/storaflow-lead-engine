"use client";

import { InlineErrorAlert } from "@/components/layout/inline-error-alert";

type ReloadErrorAlertProps = {
  title?: string;
  description: string;
};

/** Server-page friendly error with browser reload retry. */
export function ReloadErrorAlert({
  title,
  description,
}: ReloadErrorAlertProps) {
  return (
    <InlineErrorAlert
      title={title}
      description={description}
      onRetry={() => {
        window.location.reload();
      }}
    />
  );
}
