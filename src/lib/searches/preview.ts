import {
  formatCountryList,
  formatIndustryList,
  formatLanguageList,
} from "@/lib/international/display";
import { formatSourceList } from "@/lib/international/sources";
import { GEO_DISPLAY_LOCALE } from "@/lib/searches/constants";

export type SearchPreviewInput = {
  name: string;
  searchPrompt: string;
  countries: string[];
  regions: string[];
  cities: string[];
  languages: string[];
  industries: string[];
  sources: string[];
  keywords: string[];
  companySize: string;
  websiteRequired: boolean;
  linkedinRequired: boolean;
  status: string;
};

export type SearchFilterChip = {
  id: string;
  group: string;
  label: string;
};

function joinNatural(parts: string[]): string {
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

export function buildSearchFilterChips(
  input: SearchPreviewInput,
): SearchFilterChip[] {
  const chips: SearchFilterChip[] = [];

  for (const code of input.countries) {
    chips.push({
      id: `country:${code}`,
      group: "Landen",
      label: formatCountryList([code], GEO_DISPLAY_LOCALE),
    });
  }
  for (const region of input.regions) {
    chips.push({ id: `region:${region}`, group: "Regio's", label: region });
  }
  for (const city of input.cities) {
    chips.push({ id: `city:${city}`, group: "Steden", label: city });
  }
  for (const code of input.languages) {
    chips.push({
      id: `language:${code}`,
      group: "Talen",
      label: formatLanguageList([code], GEO_DISPLAY_LOCALE),
    });
  }
  for (const code of input.industries) {
    chips.push({
      id: `industry:${code}`,
      group: "Branches",
      label: formatIndustryList([code]),
    });
  }
  for (const keyword of input.keywords) {
    chips.push({
      id: `keyword:${keyword}`,
      group: "Keywords",
      label: keyword,
    });
  }
  for (const code of input.sources) {
    chips.push({
      id: `source:${code}`,
      group: "Bronnen",
      label: formatSourceList([code]),
    });
  }
  if (input.companySize) {
    chips.push({
      id: `size:${input.companySize}`,
      group: "Grootte",
      label: input.companySize,
    });
  }
  if (input.websiteRequired) {
    chips.push({
      id: "req:website",
      group: "Eisen",
      label: "Website verplicht",
    });
  }
  if (input.linkedinRequired) {
    chips.push({
      id: "req:linkedin",
      group: "Eisen",
      label: "LinkedIn verplicht",
    });
  }

  return chips;
}

export function buildSearchQueryPreview(input: SearchPreviewInput): string {
  const keywords = input.keywords.length
    ? joinNatural(input.keywords)
    : "businesses";
  const places = [
    ...input.cities,
    ...input.regions,
    ...(input.countries.length
      ? [formatCountryList(input.countries, GEO_DISPLAY_LOCALE)]
      : []),
  ].filter(Boolean);

  const lines: string[] = [];
  lines.push(
    places.length > 0
      ? `Find ${keywords} in ${joinNatural(places)}.`
      : `Find ${keywords}.`,
  );

  if (input.searchPrompt.trim()) {
    lines.push(`AI prompt: ${input.searchPrompt.trim()}`);
  }
  if (input.languages.length) {
    lines.push(
      `Languages: ${formatLanguageList(input.languages, GEO_DISPLAY_LOCALE)}`,
    );
  }
  if (input.industries.length) {
    lines.push(`Industries: ${formatIndustryList(input.industries)}`);
  }
  if (input.companySize) {
    lines.push(`Company size: ${input.companySize}`);
  }
  if (input.sources.length) {
    lines.push(`Sources: ${formatSourceList(input.sources)}`);
  }

  const requirements = [
    input.websiteRequired ? "website required" : null,
    input.linkedinRequired ? "LinkedIn required" : null,
  ].filter(Boolean);
  if (requirements.length) {
    lines.push(`Requirements: ${requirements.join(", ")}`);
  }

  return lines.join("\n");
}

export function countActiveFilters(input: SearchPreviewInput): number {
  return buildSearchFilterChips(input).length;
}
