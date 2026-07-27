/**
 * Phase 26H — Mobile / PWA constants (label catalog = i18n pattern).
 */

export const PWA_CACHE_VERSION = "storaflow-pwa-v1";

export const PWA_OFFLINE_ACTION_TYPES = [
  "company_create",
  "contact_create",
  "task_create",
  "task_update",
  "note_create",
  "activity_create",
  "comment_create",
  "ai_request_queue",
  "custom",
] as const;

export type PwaOfflineActionType = (typeof PWA_OFFLINE_ACTION_TYPES)[number];

export const PWA_OFFLINE_ACTION_LABELS: Record<PwaOfflineActionType, string> = {
  company_create: "New company",
  contact_create: "New contact",
  task_create: "New task",
  task_update: "Update task",
  note_create: "New note",
  activity_create: "New activity",
  comment_create: "New comment",
  ai_request_queue: "AI request (queued)",
  custom: "Queued action",
};

export const PWA_PUSH_TYPES = [
  "task_reminder",
  "campaign_finished",
  "automation_failed",
  "lead_alert",
  "deal_won",
  "deal_lost",
  "mention",
  "security_alert",
  "billing_alert",
] as const;

export type PwaPushType = (typeof PWA_PUSH_TYPES)[number];

export const PWA_PUSH_TYPE_LABELS: Record<PwaPushType, string> = {
  task_reminder: "Task reminder",
  campaign_finished: "Campaign finished",
  automation_failed: "Automation failed",
  lead_alert: "Lead alert",
  deal_won: "Deal won",
  deal_lost: "Deal lost",
  mention: "Mention",
  security_alert: "Security alert",
  billing_alert: "Billing alert",
};

export const MOBILE_BOTTOM_NAV = [
  { href: "/dashboard", label: "Home", icon: "LayoutDashboard" },
  { href: "/crm", label: "CRM", icon: "Kanban" },
  { href: "/companies", label: "Companies", icon: "Building2" },
  { href: "/crm/tasks", label: "Tasks", icon: "CheckSquare" },
  { href: "/copilot", label: "AI", icon: "Sparkles" },
] as const;

export const PWA_UI = {
  hubTitle: "Mobile & PWA",
  installTitle: "Install Storaflow",
  installDescription:
    "Add Storaflow to your home screen for a faster, app-like experience.",
  installCta: "Install app",
  installDismiss: "Not now",
  updateAvailable: "A new version is available.",
  updateCta: "Refresh",
  offlineBanner: "You are offline. Browsing cached data; changes will sync later.",
  onlineBanner: "Back online. Syncing queued actions…",
  queueEmpty: "No queued offline actions.",
  shareNative: "Share",
  shareCopied: "Link copied",
  voiceReady: "Voice input — ready",
  cameraReady: "Camera / scanner — ready",
  biometricReady: "Biometric unlock — ready",
  pushReady: "Push notifications — ready",
  syncConflict: "Sync conflict — review required",
} as const;

/** Pages that should remain usable from cache when offline. */
export const PWA_OFFLINE_SHELL_ROUTES = [
  "/dashboard",
  "/companies",
  "/contacts",
  "/crm",
  "/crm/tasks",
  "/crm/deals",
  "/crm/notes",
  "/collaboration/notes",
  "/activity",
] as const;

export const PWA_SW_PATH = "/sw.js";
export const PWA_SW_SCOPE = "/";
