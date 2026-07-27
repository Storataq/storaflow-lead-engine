"use client";

import { useActionState } from "react";

import { loginAction, type ActionResult } from "@/lib/auth/actions";
import { APP_DESCRIPTION } from "@/lib/constants";
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

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <Card className="w-full max-w-md border-border/80 shadow-sm">
      <CardHeader className="space-y-2">
        <CardTitle className="text-xl tracking-tight">Sign in</CardTitle>
        <CardDescription>{APP_DESCRIPTION}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mailadres</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="naam@bedrijf.nl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Wachtwoord</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
            />
          </div>
          {state && !state.success ? (
            <Alert variant="destructive">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Bezig met inloggen…" : "Inloggen"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Geen publieke registratie. Accounts worden intern aangemaakt in
            Supabase Auth.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
