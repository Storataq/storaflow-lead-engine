export const APP_NAME = "Storaflow";
export const APP_TAGLINE = "AI Lead Engine · CRM · Email Automation";
export const APP_DESCRIPTION =
  "Storaflow — AI lead engine with CRM, email automation, and company intelligence for public business data.";
export const APP_VERSION = "0.1.0";
export const APP_POWERED_BY = "Powered by Storaflow";
export const APP_COPYRIGHT = `© ${new Date().getFullYear()} Storaflow`;

/** Short label for PWA / install surfaces */
export const APP_SHORT_NAME = "Storaflow";

/** Fallback organization label when name is missing/blank */
export const DEFAULT_ORGANIZATION_NAME = "My Organization";

/**
 * Configurable support / contact email for branding surfaces.
 * Prefer organization.support_email when set.
 */
export const DEFAULT_SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "info@storalabs.com";

export function resolveOrganizationDisplayName(
  name: string | null | undefined,
): string {
  const trimmed = name?.trim();
  if (!trimmed) return DEFAULT_ORGANIZATION_NAME;

  // Soft UI alias for known legacy seed names — does not rewrite the database.
  const legacy = trimmed.toLowerCase();
  if (
    legacy === "storataq intern" ||
    legacy === "storataq" ||
    legacy === "lead engine"
  ) {
    return DEFAULT_ORGANIZATION_NAME;
  }

  return trimmed;
}

export function resolveSupportEmail(
  organizationEmail: string | null | undefined,
): string {
  const trimmed = organizationEmail?.trim();
  if (trimmed && trimmed.length > 0) return trimmed;
  return DEFAULT_SUPPORT_EMAIL;
}

export const DEFAULT_USER_AGENT =
  "StoraflowWebsiteCrawler/0.1 (+https://storalabs.com; respectful; contact-discovery)";

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
  { href: "/copilot", label: "AI Copilot", icon: "Sparkles" },
  { href: "/ai-platform", label: "AI Platform", icon: "Bot" },
  { href: "/prospecting", label: "AI Prospecting", icon: "Radar" },
  { href: "/sales", label: "AI Sales", icon: "Handshake" },
  { href: "/customer-success", label: "AI Customer Success", icon: "HeartHandshake" },
  { href: "/revenue", label: "AI Revenue", icon: "TrendingUp" },
  { href: "/orchestrator", label: "AI Orchestrator", icon: "Workflow" },
  {
    href: "/crm",
    label: "CRM",
    icon: "Kanban",
    children: [
      { href: "/crm", label: "CRM Dashboard", icon: "Gauge" },
      { href: "/crm/executive", label: "Executive Analytics", icon: "Presentation" },
      { href: "/crm/leads", label: "Leads", icon: "Users" },
      { href: "/crm/deals", label: "Deals", icon: "Handshake" },
      { href: "/crm/pipeline", label: "Pipeline", icon: "Kanban" },
      { href: "/crm/pipelines", label: "Pipelines", icon: "GitBranch" },
      { href: "/crm/funnels", label: "Funnels", icon: "Filter" },
      { href: "/crm/analytics", label: "Pipeline Analytics", icon: "TrendingUp" },
      { href: "/crm/tasks", label: "Taken", icon: "CheckSquare" },
      { href: "/crm/notes", label: "Notities", icon: "StickyNote" },
      { href: "/crm/qualification", label: "Lead Qualification", icon: "Target" },
      { href: "/crm/opportunities", label: "Opportunity Insights", icon: "Lightbulb" },
      { href: "/crm/funnel-activation", label: "Funnel Activation", icon: "GitBranch" },
      { href: "/crm/campaign-ready", label: "Campaign Ready", icon: "Mail" },
      { href: "/crm/contacts", label: "Contact Intelligence", icon: "UserPlus" },
      { href: "/crm/scoring", label: "AI Lead Scoring", icon: "Target" },
      { href: "/crm/automations", label: "Automations", icon: "Workflow" },
      { href: "/crm/intelligence", label: "Company Intelligence", icon: "Sparkles" },
      { href: "/crm/intelligence/sources", label: "Sources", icon: "Radar" },
    ],
  },
  { href: "/zoekopdrachten", label: "Zoekopdrachten", icon: "Search" },
  { href: "/jobs", label: "Scrape Jobs", icon: "ListTodo" },
  { href: "/integrations", label: "Integrations", icon: "Puzzle" },
  { href: "/api-management", label: "API", icon: "KeyRound" },
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
  {
    href: "/collaboration",
    label: "Collaboration",
    icon: "MessagesSquare",
    children: [
      { href: "/collaboration", label: "Overview", icon: "MessagesSquare" },
      {
        href: "/collaboration/notifications",
        label: "Notifications",
        icon: "Bell",
      },
      { href: "/collaboration/teams", label: "Teams", icon: "Users" },
      {
        href: "/collaboration/knowledge",
        label: "Knowledge",
        icon: "BookOpen",
      },
      { href: "/collaboration/notes", label: "Notes", icon: "StickyNote" },
      {
        href: "/collaboration/meetings",
        label: "Meetings",
        icon: "Calendar",
      },
      { href: "/activity", label: "Activity", icon: "Activity" },
    ],
  },
  {
    href: "/security",
    label: "Security",
    icon: "Shield",
    children: [
      { href: "/security", label: "Dashboard", icon: "Shield" },
      { href: "/security/sessions", label: "Sessions", icon: "KeyRound" },
      { href: "/security/devices", label: "Devices", icon: "Plug" },
      { href: "/security/mfa", label: "MFA", icon: "Shield" },
      { href: "/security/policies", label: "Policies", icon: "Settings" },
      { href: "/security/audit", label: "Audit", icon: "Activity" },
    ],
  },
  {
    href: "/billing",
    label: "Billing",
    icon: "CreditCard",
    children: [
      { href: "/billing", label: "Dashboard", icon: "CreditCard" },
      { href: "/billing/plans", label: "Plans", icon: "CreditCard" },
      { href: "/billing/usage", label: "Usage", icon: "Gauge" },
      { href: "/billing/invoices", label: "Invoices", icon: "Download" },
      { href: "/billing/seats", label: "Seats", icon: "Users" },
      { href: "/billing/addons", label: "Add-ons", icon: "Puzzle" },
      { href: "/billing/portal", label: "Portal", icon: "Settings" },
    ],
  },
  { href: "/activity", label: "Activiteiten", icon: "Activity" },
  { href: "/settings", label: "Instellingen", icon: "Settings" },
] as const;
