export const EXECUTIVE_DASHBOARD_NOTICE =
  "Executive CRM Dashboard aggregeert bestaande CRM-, qualification- en opportunity-data. Trends en bronverdeling zijn deels deterministisch afgeleid/gesimuleerd. Geen AI, geen externe API's.";

export const DATE_RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
  { value: "year", label: "This Year" },
  { value: "custom", label: "Custom Range" },
] as const;

export const FUNNEL_STAGES = [
  { id: "discovered", label: "Discovered" },
  { id: "enriched", label: "Enriched" },
  { id: "qualified", label: "Qualified" },
  { id: "campaign_ready", label: "Campaign Ready" },
  { id: "contacted", label: "Contacted" },
  { id: "engaged", label: "Engaged" },
  { id: "opportunity", label: "Opportunity" },
  { id: "proposal", label: "Proposal" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
] as const;

export const PIPELINE_OVERVIEW_STAGES = [
  { id: "new", label: "New", match: "nieuw" },
  { id: "qualified", label: "Qualified", match: "gekwalificeerd" },
  { id: "contact_planned", label: "Contact Planned", match: "contact-gepland" },
  { id: "contacted", label: "Contacted", match: "eerste-email" },
  { id: "engaged", label: "Engaged", match: "follow-up" },
  { id: "proposal", label: "Proposal", match: "demo" },
  { id: "negotiation", label: "Negotiation", match: "onderhandeling" },
  { id: "won", label: "Won", match: "gewonnen" },
  { id: "lost", label: "Lost", match: "verloren" },
  { id: "nurture", label: "Nurture", match: "nurture" },
] as const;

export const SOURCE_IDS = [
  "google_maps",
  "google_search",
  "company_website",
  "linkedin",
  "facebook",
  "instagram",
  "openstreetmap",
  "opencorporates",
  "manual",
  "import",
] as const;
