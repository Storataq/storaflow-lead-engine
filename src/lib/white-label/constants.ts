/**
 * Phase 26C — White Label constants (label catalog = i18n pattern).
 */

export const WHITE_LABEL_LOGO_SLOTS = [
  "primary_logo",
  "dark_logo",
  "light_logo",
  "favicon",
  "app_icon",
  "mobile_icon",
  "email_logo",
  "loading_logo",
  "login_logo",
  "sidebar_logo",
  "small_logo",
  "login_background",
  "login_hero",
] as const;

export type WhiteLabelLogoSlot = (typeof WHITE_LABEL_LOGO_SLOTS)[number];

export const WHITE_LABEL_LOGO_SLOT_LABELS: Record<WhiteLabelLogoSlot, string> = {
  primary_logo: "Primary logo",
  dark_logo: "Dark logo",
  light_logo: "Light logo",
  favicon: "Favicon",
  app_icon: "App icon",
  mobile_icon: "Mobile icon",
  email_logo: "Email logo",
  loading_logo: "Loading logo",
  login_logo: "Login logo",
  sidebar_logo: "Sidebar logo",
  small_logo: "Small logo",
  login_background: "Login background",
  login_hero: "Login hero image",
};

export const WHITE_LABEL_COLOR_KEYS = [
  "primary",
  "secondary",
  "accent",
  "success",
  "warning",
  "danger",
  "info",
  "background",
  "surface",
  "border",
  "text",
  "link",
] as const;

export type WhiteLabelColorKey = (typeof WHITE_LABEL_COLOR_KEYS)[number];

export const WHITE_LABEL_COLOR_LABELS: Record<WhiteLabelColorKey, string> = {
  primary: "Primary",
  secondary: "Secondary",
  accent: "Accent",
  success: "Success",
  warning: "Warning",
  danger: "Danger",
  info: "Info",
  background: "Background",
  surface: "Surface",
  border: "Border",
  text: "Text",
  link: "Link",
};

export const WHITE_LABEL_FEATURE_MODULES = [
  "crm",
  "campaigns",
  "automation",
  "analytics",
  "marketplace",
  "api",
  "reports",
  "copilot",
  "billing",
] as const;

export type WhiteLabelFeatureModule =
  (typeof WHITE_LABEL_FEATURE_MODULES)[number];

export const WHITE_LABEL_FEATURE_LABELS: Record<
  WhiteLabelFeatureModule,
  string
> = {
  crm: "CRM",
  campaigns: "Campaigns",
  automation: "Automation",
  analytics: "Analytics",
  marketplace: "Marketplace",
  api: "API",
  reports: "Reports",
  copilot: "AI Copilot",
  billing: "Billing",
};

/** Map feature toggles → top-level nav href prefixes to hide when disabled. */
export const FEATURE_NAV_PREFIXES: Record<WhiteLabelFeatureModule, string[]> = {
  crm: ["/crm"],
  campaigns: ["/email/campaigns", "/email"],
  automation: ["/crm/automations"],
  analytics: ["/crm/analytics", "/crm/executive", "/email/analytics"],
  marketplace: ["/integrations"],
  api: ["/api-management"],
  reports: ["/crm/executive", "/exports"],
  copilot: ["/copilot"],
  billing: ["/billing"],
};

export const FONT_OPTIONS = [
  "Geist",
  "Inter",
  "System UI",
  "Georgia",
  "Roboto Slab",
  "Source Sans 3",
] as const;

export const FONT_SCALE_OPTIONS = ["sm", "md", "lg"] as const;

export type FontScale = (typeof FONT_SCALE_OPTIONS)[number];

export const THEME_MODES = ["system", "light", "dark"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

export const THEME_MODE_LABELS: Record<ThemeMode, string> = {
  system: "Auto (system)",
  light: "Light",
  dark: "Dark",
};

export const ALLOWED_ASSET_MIME_TYPES = [
  "image/svg+xml",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/x-icon",
  "image/vnd.microsoft.icon",
] as const;

export const MAX_ASSET_BYTES = 512 * 1024; // 512 KB for data-URL path
export const MAX_ASSET_DIMENSION = 4096;

export const DOMAIN_STATUSES = [
  "pending_dns",
  "dns_verified",
  "ssl_pending",
  "active",
  "disabled",
  "failed",
] as const;

export const DOMAIN_STATUS_LABELS: Record<
  (typeof DOMAIN_STATUSES)[number],
  string
> = {
  pending_dns: "Pending DNS",
  dns_verified: "DNS verified",
  ssl_pending: "SSL pending",
  active: "Active",
  disabled: "Disabled",
  failed: "Failed",
};
