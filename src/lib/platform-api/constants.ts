/**
 * Phase 26B — API & Webhook Platform constants (label catalog = i18n pattern).
 */

export const API_VERSIONS = ["v1"] as const;
export type ApiVersion = (typeof API_VERSIONS)[number];
export const CURRENT_API_VERSION: ApiVersion = "v1";
export const FUTURE_API_VERSIONS = ["v2", "v3"] as const;

export const API_PERMISSION_TIERS = [
  "read_only",
  "read_write",
  "admin",
  "custom",
] as const;

export type ApiPermissionTier = (typeof API_PERMISSION_TIERS)[number];

export const API_PERMISSION_TIER_LABELS: Record<ApiPermissionTier, string> = {
  read_only: "Read only",
  read_write: "Read & write",
  admin: "Admin",
  custom: "Custom scopes",
};

export const API_KEY_STATUSES = [
  "active",
  "revoked",
  "expired",
  "rotated",
] as const;

export type ApiKeyStatus = (typeof API_KEY_STATUSES)[number];

export const API_KEY_STATUS_LABELS: Record<ApiKeyStatus, string> = {
  active: "Active",
  revoked: "Revoked",
  expired: "Expired",
  rotated: "Rotated",
};

/** Granular scopes — future modules append here. */
export const API_SCOPES = [
  "companies:read",
  "companies:write",
  "contacts:read",
  "contacts:write",
  "deals:read",
  "deals:write",
  "pipelines:read",
  "pipelines:write",
  "tasks:read",
  "tasks:write",
  "campaigns:read",
  "campaigns:write",
  "emails:read",
  "emails:write",
  "analytics:read",
  "automations:read",
  "automations:write",
  "reports:read",
  "reports:write",
  "lead_scores:read",
  "lead_scores:write",
  "company_intelligence:read",
  "contact_intelligence:read",
  "users:read",
  "organizations:read",
  "settings:read",
  "settings:write",
  "security:read",
  "security:write",
  "billing:read",
  "billing:write",
  "ai:read",
  "ai:write",
  "users:write",
  "webhooks:manage",
  "bulk:write",
  "*",
] as const;

export type ApiScope = (typeof API_SCOPES)[number];

export const API_SCOPE_LABELS: Record<ApiScope, string> = {
  "companies:read": "Companies (read)",
  "companies:write": "Companies (write)",
  "contacts:read": "Contacts (read)",
  "contacts:write": "Contacts (write)",
  "deals:read": "Deals (read)",
  "deals:write": "Deals (write)",
  "pipelines:read": "Pipelines (read)",
  "pipelines:write": "Pipelines (write)",
  "tasks:read": "Tasks (read)",
  "tasks:write": "Tasks (write)",
  "campaigns:read": "Campaigns (read)",
  "campaigns:write": "Campaigns (write)",
  "emails:read": "Emails (read)",
  "emails:write": "Emails (write)",
  "analytics:read": "Analytics (read)",
  "automations:read": "Automations (read)",
  "automations:write": "Automations (write)",
  "reports:read": "Reports (read)",
  "reports:write": "Reports (write)",
  "lead_scores:read": "Lead scores (read)",
  "lead_scores:write": "Lead scores (write)",
  "company_intelligence:read": "Company intelligence (read)",
  "contact_intelligence:read": "Contact intelligence (read)",
  "users:read": "Users (read)",
  "organizations:read": "Organizations (read)",
  "settings:read": "Settings (read)",
  "settings:write": "Settings (write)",
  "security:read": "Security (read)",
  "security:write": "Security (write)",
  "billing:read": "Billing (read)",
  "billing:write": "Billing (write)",
  "ai:read": "AI Platform (read)",
  "ai:write": "AI Platform (write)",
  "users:write": "Users (write)",
  "webhooks:manage": "Webhooks (manage)",
  "bulk:write": "Bulk operations",
  "*": "Full access",
};

export const READ_ONLY_SCOPES: ApiScope[] = API_SCOPES.filter(
  (s) => s.endsWith(":read") || s === "organizations:read" || s === "users:read",
) as ApiScope[];

export const READ_WRITE_SCOPES: ApiScope[] = API_SCOPES.filter(
  (s) => s !== "*" && s !== "webhooks:manage",
) as ApiScope[];

export const ADMIN_SCOPES: ApiScope[] = ["*"];

export const PLATFORM_WEBHOOK_EVENTS = [
  "company.created",
  "company.updated",
  "company.deleted",
  "contact.created",
  "contact.updated",
  "lead_score.changed",
  "deal.created",
  "deal.won",
  "deal.lost",
  "campaign.started",
  "campaign.finished",
  "automation.started",
  "automation.completed",
  "task.created",
  "task.completed",
] as const;

export type PlatformWebhookEvent = (typeof PLATFORM_WEBHOOK_EVENTS)[number];

export const PLATFORM_WEBHOOK_EVENT_LABELS: Record<
  PlatformWebhookEvent,
  string
> = {
  "company.created": "Company created",
  "company.updated": "Company updated",
  "company.deleted": "Company deleted",
  "contact.created": "Contact created",
  "contact.updated": "Contact updated",
  "lead_score.changed": "Lead score changed",
  "deal.created": "Deal created",
  "deal.won": "Deal won",
  "deal.lost": "Deal lost",
  "campaign.started": "Campaign started",
  "campaign.finished": "Campaign finished",
  "automation.started": "Automation started",
  "automation.completed": "Automation completed",
  "task.created": "Task created",
  "task.completed": "Task completed",
};

export const WEBHOOK_STATUSES = ["active", "paused", "disabled"] as const;
export type WebhookStatus = (typeof WEBHOOK_STATUSES)[number];
export const WEBHOOK_STATUS_LABELS: Record<WebhookStatus, string> = {
  active: "Active",
  paused: "Paused",
  disabled: "Disabled",
};

export const DELIVERY_STATUSES = [
  "queued",
  "delivered",
  "failed",
  "retrying",
  "cancelled",
] as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  queued: "Queued",
  delivered: "Delivered",
  failed: "Failed",
  retrying: "Retrying",
  cancelled: "Cancelled",
};

export const BULK_OPERATIONS = [
  "import",
  "update",
  "delete",
  "archive",
  "assign",
  "export",
  "tag",
] as const;

export type BulkOperation = (typeof BULK_OPERATIONS)[number];

export const BULK_OPERATION_LABELS: Record<BulkOperation, string> = {
  import: "Bulk import",
  update: "Bulk update",
  delete: "Bulk delete",
  archive: "Bulk archive",
  assign: "Bulk assign",
  export: "Bulk export",
  tag: "Bulk tagging",
};

export const DEFAULT_RATE_LIMIT_PER_MINUTE = 60;
export const DEFAULT_RATE_LIMIT_PER_DAY = 10_000;
export const API_KEY_PREFIX = "sf_live_";

export const API_ERROR_CODES = [
  "unauthorized",
  "forbidden",
  "not_found",
  "validation_error",
  "rate_limited",
  "expired_key",
  "revoked_key",
  "missing_scope",
  "conflict",
  "internal_error",
  "deprecated",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export const API_ERROR_LABELS: Record<ApiErrorCode, string> = {
  unauthorized: "Unauthorized",
  forbidden: "Forbidden",
  not_found: "Not found",
  validation_error: "Validation error",
  rate_limited: "Rate limit exceeded",
  expired_key: "API key expired",
  revoked_key: "API key revoked",
  missing_scope: "Missing required scope",
  conflict: "Conflict",
  internal_error: "Internal error",
  deprecated: "Deprecated endpoint",
};

export const SDK_TARGETS = [
  "javascript",
  "typescript",
  "python",
  "php",
  "csharp",
  "java",
  "go",
] as const;
