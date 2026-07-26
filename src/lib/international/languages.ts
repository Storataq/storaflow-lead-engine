import type { LanguageRecord } from "@/lib/international/types";

/**
 * ISO 639-1 language codes commonly relevant for business discovery.
 * Extensible: append codes; storage always uses the code, never a local label.
 */
export const LANGUAGES: LanguageRecord[] = [
  { code: "ar" },
  { code: "bg" },
  { code: "bn" },
  { code: "cs" },
  { code: "da" },
  { code: "de" },
  { code: "el" },
  { code: "en" },
  { code: "es" },
  { code: "et" },
  { code: "fi" },
  { code: "fr" },
  { code: "he" },
  { code: "hi" },
  { code: "hr" },
  { code: "hu" },
  { code: "id" },
  { code: "it" },
  { code: "ja" },
  { code: "ko" },
  { code: "lt" },
  { code: "lv" },
  { code: "ms" },
  { code: "nl" },
  { code: "no" },
  { code: "pl" },
  { code: "pt" },
  { code: "ro" },
  { code: "ru" },
  { code: "sk" },
  { code: "sl" },
  { code: "sr" },
  { code: "sv" },
  { code: "th" },
  { code: "tr" },
  { code: "uk" },
  { code: "vi" },
  { code: "zh" },
];

export const LANGUAGE_CODES = new Set(LANGUAGES.map((item) => item.code));

export function isLanguageCode(value: string): boolean {
  return LANGUAGE_CODES.has(value.toLowerCase());
}
