import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  confirmResubscribe,
  resolvePreferenceToken,
} from "@/lib/email/preferences";
import { resolvePreferenceLocale, tp } from "@/lib/email/preferences/i18n";

export const metadata: Metadata = {
  title: "Confirm resubscribe",
  robots: { index: false, follow: false },
};

export default async function ResubscribeConfirmPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ confirm?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const locale = resolvePreferenceLocale(null, "en");
  const resolved = await resolvePreferenceToken(token);

  if (!resolved || resolved.tokenRow.purpose !== "resubscribe_confirm") {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-2xl font-semibold">
          {tp(locale, "error.invalidToken")}
        </h1>
      </main>
    );
  }

  if (sp.confirm === "1") {
    const result = await confirmResubscribe(token);
    return (
      <main className="mx-auto max-w-lg px-4 py-16 space-y-4">
        <h1 className="text-2xl font-semibold">{tp(locale, "resub.title")}</h1>
        <p role="status">
          {result.success ? tp(locale, "resub.done") : result.message}
        </p>
      </main>
    );
  }

  async function confirmAction() {
    "use server";
    redirect(`/preferences/resubscribe/${encodeURIComponent(token)}?confirm=1`);
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-16 space-y-6">
      <h1 className="text-2xl font-semibold">{tp(locale, "resub.title")}</h1>
      <p className="text-muted-foreground">
        {resolved.organization?.name ?? "Organization"}
      </p>
      <form action={confirmAction}>
        <Button type="submit">{tp(locale, "resub.confirm")}</Button>
      </form>
    </main>
  );
}
