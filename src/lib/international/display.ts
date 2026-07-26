import { COUNTRY_BY_CODE } from "@/lib/international/countries";
import { INDUSTRY_BY_CODE } from "@/lib/international/industries";

const DEFAULT_DISPLAY_LOCALE = "en";

function countryDisplayNames(locale = DEFAULT_DISPLAY_LOCALE) {
  try {
    return new Intl.DisplayNames([locale, "en"], { type: "region" });
  } catch {
    return null;
  }
}

function languageDisplayNames(locale = DEFAULT_DISPLAY_LOCALE) {
  try {
    return new Intl.DisplayNames([locale, "en"], { type: "language" });
  } catch {
    return null;
  }
}

/** Resolve ISO country code → localized display name (fallback: code). */
export function formatCountryName(
  code: string,
  locale = DEFAULT_DISPLAY_LOCALE,
): string {
  const normalized = code.toUpperCase();
  const names = countryDisplayNames(locale);
  return names?.of(normalized) ?? normalized;
}

export function formatCountryList(
  codes: string[],
  locale = DEFAULT_DISPLAY_LOCALE,
): string {
  if (!codes.length) return "—";
  return codes.map((code) => formatCountryName(code, locale)).join(", ");
}

export function formatCountryOptionLabel(
  code: string,
  locale = DEFAULT_DISPLAY_LOCALE,
): string {
  const country = COUNTRY_BY_CODE[code.toUpperCase()];
  const name = formatCountryName(code, locale);
  if (!country) return name;
  return `${name} (+${country.callingCode})`;
}

export function formatLanguageName(
  code: string,
  locale = DEFAULT_DISPLAY_LOCALE,
): string {
  const normalized = code.toLowerCase();
  const names = languageDisplayNames(locale);
  return names?.of(normalized) ?? normalized;
}

export function formatLanguageList(
  codes: string[],
  locale = DEFAULT_DISPLAY_LOCALE,
): string {
  if (!codes.length) return "—";
  return codes.map((code) => formatLanguageName(code, locale)).join(", ");
}

export function formatIndustryLabel(code: string): string {
  return INDUSTRY_BY_CODE[code]?.labelEn ?? code;
}

export function formatIndustryList(codes: string[]): string {
  if (!codes.length) return "—";
  return codes.map((code) => formatIndustryLabel(code)).join(", ");
}
