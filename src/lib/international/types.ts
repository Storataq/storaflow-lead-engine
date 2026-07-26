/**
 * International reference data for search criteria.
 * Values are ISO codes / stable keys — never locale-specific labels in storage.
 */

export type CountryCode = string; // ISO 3166-1 alpha-2
export type LanguageCode = string; // ISO 639-1
export type IndustryCode = string;

export type CountryRecord = {
  /** ISO 3166-1 alpha-2 */
  code: CountryCode;
  /** ITU-T E.164 country calling code without '+' */
  callingCode: string;
  /** Lightweight national number hint for future validation (digits only example length) */
  nationalNumberExample: string;
};

export type LanguageRecord = {
  /** ISO 639-1 */
  code: LanguageCode;
};

export type IndustryRecord = {
  /** Stable machine key */
  code: IndustryCode;
  /** English label (UI may localize later) */
  labelEn: string;
};
