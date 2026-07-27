import type { Metadata } from "next";

import { UnsubscribePageClient } from "@/components/email/preference-center-client";
import {
  issuePreferenceTokens,
  resolvePreferenceToken,
} from "@/lib/email/preferences";
import { maskEmail } from "@/lib/email/preferences/tokens";
import { resolvePreferenceLocale, tp } from "@/lib/email/preferences/i18n";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const resolved = await resolvePreferenceToken(token);

  if (!resolved?.organization) {
    const locale = resolvePreferenceLocale(null, "en");
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-2xl font-semibold">
          {tp(locale, "error.invalidToken")}
        </h1>
      </main>
    );
  }

  const tokens = await issuePreferenceTokens({
    organizationId: resolved.tokenRow.organization_id,
    emailNormalized: resolved.tokenRow.email_normalized,
    queueItemId: resolved.tokenRow.related_queue_item_id,
    campaignId: resolved.tokenRow.related_campaign_id,
    categoryCode: resolved.tokenRow.related_category_code,
  });

  return (
    <main>
      <UnsubscribePageClient
        token={token}
        organizationName={resolved.organization.name}
        maskedEmail={maskEmail(resolved.tokenRow.email_normalized)}
        preferenceCenterUrl={tokens.preferenceCenterUrl}
        categoryCode={resolved.tokenRow.related_category_code}
        preferredLanguage={resolved.preference?.preferred_language ?? null}
        orgDefaultLanguage={resolved.organization.default_email_language}
      />
    </main>
  );
}
