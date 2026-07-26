"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <div className="mx-auto max-w-lg py-10">
      <Card className="shadow-none">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="size-5 text-destructive" />
          </div>
          <CardTitle className="text-base">Er ging iets mis</CardTitle>
          <CardDescription className="text-pretty">
            {toUserFacingError(
              error,
              "Deze pagina kon niet worden geladen. Probeer het opnieuw.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center gap-2 pb-8">
          <Button type="button" onClick={reset}>
            Opnieuw proberen
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              window.location.href = "/dashboard";
            }}
          >
            Naar dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
