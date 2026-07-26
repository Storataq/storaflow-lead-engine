export const APP_NAME = "Lead Engine";
export const APP_DESCRIPTION =
  "Interne leadverzamelaar voor publieke zakelijke contactgegevens";

export const DEFAULT_USER_AGENT =
  "StorataQ-LeadEngine/0.1 (+internal; respectful-crawler)";

export type NavChild = {
  href: string;
  label: string;
  icon: string;
};

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  children?: readonly NavChild[];
};

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  {
    href: "/crm",
    label: "CRM",
    icon: "Kanban",
    children: [
      { href: "/crm", label: "CRM Dashboard", icon: "Gauge" },
      { href: "/crm/leads", label: "Leads", icon: "Users" },
      { href: "/crm/deals", label: "Deals", icon: "Handshake" },
      { href: "/crm/pipeline", label: "Pipeline", icon: "Kanban" },
      { href: "/crm/tasks", label: "Taken", icon: "CheckSquare" },
      { href: "/crm/notes", label: "Notities", icon: "StickyNote" },
      { href: "/crm/qualification", label: "Lead Qualification", icon: "Target" },
      { href: "/crm/opportunities", label: "Opportunity Insights", icon: "Lightbulb" },
      { href: "/crm/intelligence", label: "Company Intelligence", icon: "Sparkles" },
      { href: "/crm/intelligence/sources", label: "Sources", icon: "Radar" },
    ],
  },
  { href: "/zoekopdrachten", label: "Zoekopdrachten", icon: "Search" },
  { href: "/jobs", label: "Scrape Jobs", icon: "ListTodo" },
  { href: "/connectors", label: "Connectors", icon: "Plug" },
  { href: "/companies", label: "Bedrijven", icon: "Building2" },
  { href: "/contacts", label: "Contactgegevens", icon: "Mail" },
  { href: "/exclusions", label: "Uitsluitlijst", icon: "Ban" },
  { href: "/exports", label: "Exporteren", icon: "Download" },
  { href: "/activity", label: "Activiteiten", icon: "Activity" },
  { href: "/settings", label: "Instellingen", icon: "Settings" },
] as const;
