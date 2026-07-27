/**
 * Lightweight preference-center copy keys (EN/NL).
 * Full i18n framework is not present in the app; keep keys centralized.
 */

export type PreferenceLocale = "en" | "nl";

const STRINGS = {
  en: {
    "pref.title": "Communication preferences",
    "pref.subtitle": "Choose how you want to hear from us.",
    "pref.status": "Current status",
    "pref.categories": "Email categories",
    "pref.frequency": "Email frequency",
    "pref.pause": "Pause emails",
    "pref.language": "Preferred language",
    "pref.timezone": "Preferred timezone",
    "pref.unsubscribeAll": "Unsubscribe from all non-essential email",
    "pref.save": "Save preferences",
    "pref.saved": "Your preferences were saved.",
    "pref.privacy": "Privacy policy",
    "pref.terms": "Terms",
    "pref.maskedEmail": "Recipient",
    "pref.lastUpdate": "Last updated",
    "pref.noPause": "No pause",
    "pref.pause7": "Pause 7 days",
    "pref.pause14": "Pause 14 days",
    "pref.pause30": "Pause 30 days",
    "pref.pause60": "Pause 60 days",
    "pref.pause90": "Pause 90 days",
    "unsub.title": "Unsubscribe",
    "unsub.confirm": "Unsubscribe from all non-essential email",
    "unsub.category": "Unsubscribe from this category only",
    "unsub.pause": "Pause for 30 days",
    "unsub.openPrefs": "Open preference center",
    "unsub.done": "You have been unsubscribed.",
    "unsub.reasonTitle": "Optional: tell us why (after unsubscribe)",
    "oneclick.ok": "You have been unsubscribed.",
    "resub.title": "Confirm resubscribe",
    "resub.confirm": "Yes, resubscribe to non-essential email",
    "resub.blocked": "Resubscribe is not available while a mandatory block is active.",
    "resub.done": "Resubscribe confirmed.",
    "error.invalidToken": "This link is invalid or has expired.",
  },
  nl: {
    "pref.title": "Communicatievoorkeuren",
    "pref.subtitle": "Kies hoe u van ons wilt horen.",
    "pref.status": "Huidige status",
    "pref.categories": "E-mailcategorieën",
    "pref.frequency": "E-mailfrequentie",
    "pref.pause": "E-mails pauzeren",
    "pref.language": "Voorkeurstaal",
    "pref.timezone": "Voorkeurs-tijdzone",
    "pref.unsubscribeAll": "Afmelden voor alle niet-essentiële e-mail",
    "pref.save": "Voorkeuren opslaan",
    "pref.saved": "Uw voorkeuren zijn opgeslagen.",
    "pref.privacy": "Privacybeleid",
    "pref.terms": "Voorwaarden",
    "pref.maskedEmail": "Ontvanger",
    "pref.lastUpdate": "Laatst bijgewerkt",
    "pref.noPause": "Geen pauze",
    "pref.pause7": "Pauzeer 7 dagen",
    "pref.pause14": "Pauzeer 14 dagen",
    "pref.pause30": "Pauzeer 30 dagen",
    "pref.pause60": "Pauzeer 60 dagen",
    "pref.pause90": "Pauzeer 90 dagen",
    "unsub.title": "Afmelden",
    "unsub.confirm": "Afmelden voor alle niet-essentiële e-mail",
    "unsub.category": "Alleen deze categorie afmelden",
    "unsub.pause": "Pauzeer 30 dagen",
    "unsub.openPrefs": "Voorkeurencentrum openen",
    "unsub.done": "U bent afgemeld.",
    "unsub.reasonTitle": "Optioneel: vertel waarom (na afmelden)",
    "oneclick.ok": "U bent afgemeld.",
    "resub.title": "Herinschrijving bevestigen",
    "resub.confirm": "Ja, opnieuw aanmelden voor niet-essentiële e-mail",
    "resub.blocked": "Herinschrijven is niet mogelijk terwijl een verplichte blokkade actief is.",
    "resub.done": "Herinschrijving bevestigd.",
    "error.invalidToken": "Deze link is ongeldig of verlopen.",
  },
} as const;

export type PreferenceStringKey = keyof (typeof STRINGS)["en"];

export function resolvePreferenceLocale(
  preferred?: string | null,
  orgDefault?: string | null,
): PreferenceLocale {
  const candidate = (preferred || orgDefault || "en").toLowerCase();
  if (candidate.startsWith("nl")) return "nl";
  return "en";
}

export function tp(
  locale: PreferenceLocale,
  key: PreferenceStringKey,
): string {
  return STRINGS[locale][key] ?? STRINGS.en[key] ?? key;
}
