export const APP_NAME = "Storaflow";
export const APP_TAGLINE = "AI Lead Engine · CRM · Email Automation";
export const APP_DESCRIPTION =
  "Storaflow — AI lead engine with CRM, email automation, and company intelligence for public business data.";
export const APP_VERSION = "0.1.0";
export const APP_POWERED_BY = "Powered by Storaflow";
export const APP_COPYRIGHT = `© ${new Date().getFullYear()} Storaflow`;

/** Short label for PWA / install surfaces */
export const APP_SHORT_NAME = "Storaflow";

export const DEFAULT_USER_AGENT =
  "StoraflowWebsiteCrawler/0.1 (+https://storataq.local; respectful; contact-discovery)";

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
      { href: "/crm/executive", label: "Executive Dashboard", icon: "Presentation" },
      { href: "/crm/leads", label: "Leads", icon: "Users" },
      { href: "/crm/deals", label: "Deals", icon: "Handshake" },
      { href: "/crm/pipeline", label: "Pipeline", icon: "Kanban" },
      { href: "/crm/pipelines", label: "Pipelines", icon: "GitBranch" },
      { href: "/crm/funnels", label: "Funnels", icon: "Filter" },
      { href: "/crm/tasks", label: "Taken", icon: "CheckSquare" },
      { href: "/crm/notes", label: "Notities", icon: "StickyNote" },
      { href: "/crm/qualification", label: "Lead Qualification", icon: "Target" },
      { href: "/crm/opportunities", label: "Opportunity Insights", icon: "Lightbulb" },
      { href: "/crm/funnel-activation", label: "Funnel Activation", icon: "GitBranch" },
      { href: "/crm/campaign-ready", label: "Campaign Ready", icon: "Mail" },
      { href: "/crm/intelligence", label: "Company Intelligence", icon: "Sparkles" },
      { href: "/crm/intelligence/sources", label: "Sources", icon: "Radar" },
    ],
  },
  { href: "/zoekopdrachten", label: "Zoekopdrachten", icon: "Search" },
  { href: "/jobs", label: "Scrape Jobs", icon: "ListTodo" },
  { href: "/connectors", label: "Connectors", icon: "Plug" },
  { href: "/companies", label: "Bedrijven", icon: "Building2" },
  { href: "/enrichment", label: "Website Enrichment", icon: "Globe2" },
  {
    href: "/email",
    label: "Email",
    icon: "Mail",
    children: [
      { href: "/email", label: "Overview", icon: "Mail" },
      { href: "/email/campaigns", label: "Campaigns", icon: "Mail" },
      { href: "/email/templates", label: "Templates", icon: "StickyNote" },
      { href: "/email/sequences", label: "Sequences", icon: "ListTodo" },
      { href: "/email/recipients", label: "Recipients", icon: "Users" },
      { href: "/email/queue", label: "Queue", icon: "ListTodo" },
      { href: "/email/analytics", label: "Analytics", icon: "Gauge" },
      { href: "/email/preferences", label: "Preferences", icon: "Settings" },
      { href: "/email/suppression", label: "Suppression", icon: "Ban" },
      { href: "/email/settings", label: "Settings", icon: "Settings" },
    ],
  },
  { href: "/contacts", label: "Contactgegevens", icon: "Mail" },
  { href: "/exclusions", label: "Uitsluitlijst", icon: "Ban" },
  { href: "/exports", label: "Exporteren", icon: "Download" },
  { href: "/activity", label: "Activiteiten", icon: "Activity" },
  { href: "/settings", label: "Instellingen", icon: "Settings" },
] as const;
