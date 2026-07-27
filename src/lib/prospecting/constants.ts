/**
 * Phase 27B — AI Prospecting Agent constants (client-safe).
 */

export const PROSPECTING_AGENT_SLUG = "storaflow-prospecting-agent";
export const PROSPECTING_AGENT_VERSION = "1.0.0";

export const BUSINESS_CLASSES = [
  "retail",
  "manufacturing",
  "healthcare",
  "hospitality",
  "automotive",
  "wholesale",
  "logistics",
  "construction",
  "education",
  "finance",
  "software",
  "food",
  "nonprofit",
  "professional_services",
  "real_estate",
  "agriculture",
  "energy",
  "media",
  "other",
] as const;

export type BusinessClass = (typeof BUSINESS_CLASSES)[number];

export const BUSINESS_CLASS_LABELS: Record<BusinessClass, string> = {
  retail: "Retail",
  manufacturing: "Manufacturing",
  healthcare: "Healthcare",
  hospitality: "Hospitality",
  automotive: "Automotive",
  wholesale: "Wholesale",
  logistics: "Logistics",
  construction: "Construction",
  education: "Education",
  finance: "Finance",
  software: "Software",
  food: "Food",
  nonprofit: "Non-profit",
  professional_services: "Professional services",
  real_estate: "Real estate",
  agriculture: "Agriculture",
  energy: "Energy",
  media: "Media",
  other: "Other",
};

export const LEAD_QUALITIES = [
  "cold",
  "warm",
  "hot",
  "enterprise",
  "strategic",
] as const;

export type LeadQuality = (typeof LEAD_QUALITIES)[number];

export const LEAD_QUALITY_LABELS: Record<LeadQuality, string> = {
  cold: "Cold",
  warm: "Warm",
  hot: "Hot",
  enterprise: "Enterprise",
  strategic: "Strategic",
};

export const PROSPECT_RECOMMENDATIONS = [
  "call_now",
  "send_email",
  "book_demo",
  "linkedin",
  "later",
  "not_interesting",
] as const;

export type ProspectRecommendation = (typeof PROSPECT_RECOMMENDATIONS)[number];

export const PROSPECT_RECOMMENDATION_LABELS: Record<
  ProspectRecommendation,
  string
> = {
  call_now: "Bel direct",
  send_email: "Stuur e-mail",
  book_demo: "Plan demo",
  linkedin: "LinkedIn benaderen",
  later: "Later opvolgen",
  not_interesting: "Niet interessant",
};

export const PROSPECT_STATUSES = [
  "new",
  "researching",
  "analyzed",
  "scored",
  "enriched",
  "crm_linked",
  "dismissed",
  "failed",
] as const;

export type ProspectStatus = (typeof PROSPECT_STATUSES)[number];

export const PROSPECT_STATUS_LABELS: Record<ProspectStatus, string> = {
  new: "New",
  researching: "Researching",
  analyzed: "Analyzed",
  scored: "Scored",
  enriched: "Enriched",
  crm_linked: "CRM linked",
  dismissed: "Dismissed",
  failed: "Failed",
};

export const DECISION_MAKER_ROLES = [
  "CEO",
  "Owner",
  "Managing Director",
  "Sales Manager",
  "Purchasing Manager",
  "Operations Manager",
  "Marketing Manager",
  "Warehouse Manager",
  "IT Manager",
] as const;

export const OPPORTUNITY_CODES = [
  "no_crm",
  "outdated_website",
  "no_online_booking",
  "no_inventory_software",
  "no_webshop",
  "manual_work_heavy",
  "strong_growth",
  "international_expansion",
  "new_locations",
  "weak_contactability",
  "storaflow_fit",
] as const;

export type OpportunityCode = (typeof OPPORTUNITY_CODES)[number];

export const OPPORTUNITY_LABELS: Record<OpportunityCode, string> = {
  no_crm: "Geen CRM",
  outdated_website: "Verouderde website",
  no_online_booking: "Geen online reserveringen",
  no_inventory_software: "Geen voorraadsoftware",
  no_webshop: "Geen webshop",
  manual_work_heavy: "Veel handmatig werk",
  strong_growth: "Sterke groei",
  international_expansion: "Internationale uitbreiding",
  new_locations: "Nieuwe vestigingen",
  weak_contactability: "Zwakke contactbaarheid",
  storaflow_fit: "Sterke Storaflow-match",
};

export const EMPLOYEE_BANDS = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1000+",
] as const;

export const REVENUE_BANDS = [
  "unknown",
  "<1M",
  "1M-5M",
  "5M-20M",
  "20M-50M",
  "50M+",
] as const;

export const PROSPECTING_UI = {
  hubTitle: "AI Prospecting",
  overviewTitle: "Overview",
  prospectsTitle: "Prospects",
  companiesTitle: "Companies",
  researchTitle: "Research",
  leadScoreTitle: "Lead Score",
  enrichmentTitle: "Enrichment",
  opportunitiesTitle: "Opportunities",
  historyTitle: "History",
  settingsTitle: "Settings",
} as const;

export const PROSPECTING_NAV = [
  { href: "/prospecting", label: PROSPECTING_UI.overviewTitle },
  { href: "/prospecting/prospects", label: PROSPECTING_UI.prospectsTitle },
  { href: "/prospecting/companies", label: PROSPECTING_UI.companiesTitle },
  { href: "/prospecting/research", label: PROSPECTING_UI.researchTitle },
  { href: "/prospecting/lead-score", label: PROSPECTING_UI.leadScoreTitle },
  { href: "/prospecting/enrichment", label: PROSPECTING_UI.enrichmentTitle },
  {
    href: "/prospecting/opportunities",
    label: PROSPECTING_UI.opportunitiesTitle,
  },
  { href: "/prospecting/history", label: PROSPECTING_UI.historyTitle },
  { href: "/prospecting/settings", label: PROSPECTING_UI.settingsTitle },
] as const;
