"use client";

import { useActionState } from "react";

import {
  createOrganizationAction,
  type ActionResult,
} from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: ActionResult | null = null;

export function CreateOrganizationForm() {
  const [state, formAction, pending] = useActionState(
    createOrganizationAction,
    initialState,
  );

  return (
    <Card className="mx-auto w-full max-w-lg border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl tracking-tight">
          Organisatie aanmaken
        </CardTitle>
        <CardDescription>
          Maak een organisatie aan om leads, zoekopdrachten en scrapingtaken te
          beheren. Dit vormt later de basis voor multi-tenant uitbreiding.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Organisatienaam</Label>
            <Input
              id="name"
              name="name"
              required
              minLength={2}
              placeholder="Bijv. StorataQ Intern"
            />
          </div>
          {state && !state.success ? (
            <Alert variant="destructive">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Bezig…" : "Organisatie aanmaken"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
