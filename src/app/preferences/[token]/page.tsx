import type { Metadata } from "next";

import { PreferenceCenterClient } from "@/components/email/preference-center-client";
import {
  recordPreferenceCenterOpenAction,
} from "@/lib/email/preferences/actions";
import {
  resolvePreferenceToken,
} from "@/lib/email/preferences";
import { maskEmail } from "@/lib/email/preferences/tokens";
import { tp, resolvePreferenceLocale } from "@/lib/email/preferences/i18n";
import type { CommunicationFrequency } from "@/lib/email/preferences/constants";

export const metadata: Metadata = {
  title: "Communication preferences",
  robots: { index: false, follow: false },
};

export default async function PreferenceCenterPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const resolved = await resolvePreferenceToken(token);

  if (!resolved?.organization || !resolved.preference) {
    const locale = resolvePreferenceLocale(null, "en");
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-2xl font-semibold">
          {tp(locale, "error.invalidToken")}
        </h1>
      </main>
    );
  }

  await recordPreferenceCenterOpenAction(token);

  return (
    <main>
      <PreferenceCenterClient
        token={token}
        organizationName={resolved.organization.name}
        logoUrl={resolved.organization.logo_url}
        postalAddress={resolved.organization.postal_address}
        privacyPolicyUrl={resolved.organization.privacy_policy_url}
        termsUrl={resolved.organization.terms_url}
        supportEmail={resolved.organization.support_email}
        maskedEmail={maskEmail(resolved.tokenRow.email_normalized)}
        effectiveStatus={resolved.preference.effective_status}
        lastUpdate={resolved.preference.last_preference_update_at}
        categories={(resolved.categories as Array<{
          code: string;
          name: string;
          is_essential: boolean;
        }>)}
        categoryPreferences={
          (resolved.preference.category_preferences_json as Record<
            string,
            boolean
          >) ?? {}
        }
        frequencyType={
          (resolved.preference.frequency_type as CommunicationFrequency) ??
          "immediate"
        }
        preferredLanguage={resolved.preference.preferred_language}
        preferredTimezone={resolved.preference.preferred_timezone}
        orgDefaultLanguage={resolved.organization.default_email_language}
      />
    </main>
  );
}
