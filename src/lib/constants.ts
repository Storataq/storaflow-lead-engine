export const APP_NAME = "Lead Engine";
export const APP_DESCRIPTION =
  "Interne leadverzamelaar voor publieke zakelijke contactgegevens";

export const DEFAULT_USER_AGENT =
  "StorataQ-LeadEngine/0.1 (+internal; respectful-crawler)";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/zoekopdrachten", label: "Zoekopdrachten", icon: "Search" },
  { href: "/jobs", label: "Scrapingtaken", icon: "ListTodo" },
  { href: "/companies", label: "Bedrijven", icon: "Building2" },
  { href: "/contacts", label: "Contactgegevens", icon: "Mail" },
  { href: "/exclusions", label: "Uitsluitlijst", icon: "Ban" },
  { href: "/exports", label: "Exporteren", icon: "Download" },
  { href: "/activity", label: "Activiteiten", icon: "Activity" },
  { href: "/settings", label: "Instellingen", icon: "Settings" },
] as const;
