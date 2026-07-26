"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type PageErrorStateProps = {
  title?: string;
  description: string;
  onRetry?: () => void;
  backHref?: string;
  backLabel?: string;
};

/**
 * Friendly page-level error card. Never expose raw technical errors —
 * pass a user-facing message from `toUserFacingError`.
 */
export function PageErrorState({
  title = "Er ging iets mis",
  description,
  onRetry,
  backHref = "/dashboard",
  backLabel = "Naar dashboard",
}: PageErrorStateProps) {
  return (
    <div className="mx-auto max-w-lg py-10">
      <Card className="shadow-none" role="alert">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle
              className="size-5 text-destructive"
              aria-hidden
            />
          </div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription className="text-pretty">{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap justify-center gap-2 pb-8">
          {onRetry ? (
            <Button type="button" onClick={onRetry}>
              Opnieuw proberen
            </Button>
          ) : null}
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href={backHref} />}
          >
            {backLabel}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
