import type { CompanySizeOption, SearchCriteriaStatus } from "@/types/database";

export const SEARCH_CRITERIA_STATUSES: {
  value: SearchCriteriaStatus;
  label: string;
}[] = [
  { value: "active", label: "Actief" },
  { value: "paused", label: "Gepauzeerd" },
  { value: "draft", label: "Concept" },
];

export const COMPANY_SIZE_OPTIONS: {
  value: CompanySizeOption;
  label: string;
}[] = [
  { value: "1-10", label: "1-10" },
  { value: "11-50", label: "11-50" },
  { value: "51-250", label: "51-250" },
  { value: "250+", label: "250+" },
];

export const COUNTRY_OPTIONS = [
  "Nederland",
  "België",
  "Duitsland",
  "Frankrijk",
  "Verenigd Koninkrijk",
  "Portugal",
  "Spanje",
  "Italië",
  "Luxemburg",
  "Oostenrijk",
  "Zwitserland",
] as const;

export const INDUSTRY_OPTIONS = [
  "Retail",
  "Horeca",
  "Bouw",
  "Zakelijke dienstverlening",
  "IT & software",
  "Industrie",
  "Transport & logistiek",
  "Zorg",
  "Onderwijs",
  "Creatief & media",
  "Groothandel",
  "Automotive",
  "Agrarisch",
  "Overig",
] as const;

export type SearchSortOption =
  | "newest"
  | "oldest"
  | "name_asc"
  | "name_desc";

export const SEARCH_SORT_OPTIONS: {
  value: SearchSortOption;
  label: string;
}[] = [
  { value: "newest", label: "Nieuwste" },
  { value: "oldest", label: "Oudste" },
  { value: "name_asc", label: "Naam A-Z" },
  { value: "name_desc", label: "Naam Z-A" },
];

export function searchStatusLabel(status: string): string {
  const match = SEARCH_CRITERIA_STATUSES.find((item) => item.value === status);
  return match?.label ?? status;
}
