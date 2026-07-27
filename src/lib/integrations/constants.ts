/**
 * Phase 25I — Integrations Marketplace constants (label catalog = current i18n pattern).
 */

export const INTEGRATION_CATEGORIES = [
  "crm",
  "marketing",
  "email",
  "communication",
  "accounting",
  "ecommerce",
  "productivity",
  "storage",
  "calendars",
  "ai_providers",
  "automation",
  "finance",
  "erp",
  "custom",
] as const;

export type IntegrationCategory = (typeof INTEGRATION_CATEGORIES)[number];

export const INTEGRATION_CATEGORY_LABELS: Record<IntegrationCategory, string> = {
  crm: "CRM",
  marketing: "Marketing",
  email: "Email",
  communication: "Communication",
  accounting: "Accounting",
  ecommerce: "E-commerce",
  productivity: "Productivity",
  storage: "Storage",
  calendars: "Calendars",
  ai_providers: "AI Providers",
  automation: "Automation",
  finance: "Finance",
  erp: "ERP",
  custom: "Custom",
};

export const CONNECTION_STATUSES = [
  "disconnected",
  "pending_auth",
  "connected",
  "error",
  "needs_reauth",
  "disabled",
] as const;

export type ConnectionStatus = (typeof CONNECTION_STATUSES)[number];

export const CONNECTION_STATUS_LABELS: Record<ConnectionStatus, string> = {
  disconnected: "Disconnected",
  pending_auth: "Pending authorization",
  connected: "Connected",
  error: "Error",
  needs_reauth: "Needs re-authorization",
  disabled: "Disabled",
};

export const HEALTH_STATUSES = [
  "unknown",
  "healthy",
  "degraded",
  "unhealthy",
] as const;

export type HealthStatus = (typeof HEALTH_STATUSES)[number];

export const HEALTH_STATUS_LABELS: Record<HealthStatus, string> = {
  unknown: "Unknown",
  healthy: "Healthy",
  degraded: "Degraded",
  unhealthy: "Unhealthy",
};

export const SYNC_MODES = [
  "manual",
  "scheduled",
  "incremental",
  "full",
  "webhook",
] as const;

export type SyncMode = (typeof SYNC_MODES)[number];

export const SYNC_MODE_LABELS: Record<SyncMode, string> = {
  manual: "Manual sync",
  scheduled: "Scheduled sync",
  incremental: "Incremental sync",
  full: "Full sync",
  webhook: "Webhook-triggered",
};

export const SYNC_RUN_STATUSES = [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
  "partial",
] as const;

export type SyncRunStatus = (typeof SYNC_RUN_STATUSES)[number];

export const SYNC_RUN_STATUS_LABELS: Record<SyncRunStatus, string> = {
  queued: "Queued",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
  partial: "Partial",
};

export const SYNC_ERROR_CODES = [
  "expired_token",
  "missing_permissions",
  "rate_limited",
  "timeout",
  "api_error",
  "connection_lost",
  "invalid_credentials",
  "conflict",
  "unknown",
] as const;

export type SyncErrorCode = (typeof SYNC_ERROR_CODES)[number];

export const SYNC_ERROR_LABELS: Record<SyncErrorCode, string> = {
  expired_token: "Expired token",
  missing_permissions: "Missing permissions",
  rate_limited: "Rate limit",
  timeout: "Timeout",
  api_error: "API error",
  connection_lost: "Connection lost",
  invalid_credentials: "Invalid credentials",
  conflict: "Conflict detected",
  unknown: "Unknown error",
};

export const MARKETPLACE_SORTS = [
  "popular",
  "newest",
  "alphabetical",
] as const;

export type MarketplaceSort = (typeof MARKETPLACE_SORTS)[number];

export const MARKETPLACE_SORT_LABELS: Record<MarketplaceSort, string> = {
  popular: "Popular",
  newest: "Newest",
  alphabetical: "Alphabetical",
};
