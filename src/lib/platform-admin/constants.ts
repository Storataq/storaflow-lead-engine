/**
 * Phase 26G — Platform admin constants (label catalog = i18n pattern).
 * Separate from organization RBAC labels.
 */

export const PLATFORM_ROLES = [
  "platform_owner",
  "platform_admin",
  "platform_support",
  "platform_readonly",
] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const PLATFORM_ROLE_LABELS: Record<PlatformRole, string> = {
  platform_owner: "Platform owner",
  platform_admin: "Platform admin",
  platform_support: "Platform support",
  platform_readonly: "Platform read-only",
};

export const PLATFORM_PERMISSIONS = [
  "dashboard:view",
  "organizations:view",
  "organizations:manage",
  "users:view",
  "users:manage",
  "subscriptions:view",
  "subscriptions:manage",
  "licenses:view",
  "licenses:manage",
  "support:view",
  "monitoring:view",
  "audit:view",
  "feature_flags:manage",
  "announcements:manage",
  "settings:manage",
  "impersonate:read_only",
  "impersonate:elevated",
  "backups:manage",
] as const;

export type PlatformPermission = (typeof PLATFORM_PERMISSIONS)[number];

export const ORG_LIFECYCLE_STATUSES = [
  "active",
  "suspended",
  "archived",
  "deleted",
] as const;

export type OrgLifecycleStatus = (typeof ORG_LIFECYCLE_STATUSES)[number];

export const ORG_LIFECYCLE_LABELS: Record<OrgLifecycleStatus, string> = {
  active: "Active",
  suspended: "Suspended",
  archived: "Archived",
  deleted: "Deleted",
};

export const LICENSE_TYPES = [
  "seat",
  "enterprise",
  "white_label",
  "partner",
  "lifetime",
  "custom",
] as const;

export type LicenseType = (typeof LICENSE_TYPES)[number];

export const LICENSE_TYPE_LABELS: Record<LicenseType, string> = {
  seat: "Seat license",
  enterprise: "Enterprise license",
  white_label: "White label license",
  partner: "Partner license",
  lifetime: "Lifetime license",
  custom: "Custom license",
};

export const ANNOUNCEMENT_TYPES = [
  "maintenance",
  "release_notes",
  "security",
  "feature",
  "general",
] as const;

export const ANNOUNCEMENT_TYPE_LABELS: Record<
  (typeof ANNOUNCEMENT_TYPES)[number],
  string
> = {
  maintenance: "Maintenance",
  release_notes: "Release notes",
  security: "Security notice",
  feature: "Feature release",
  general: "General",
};

export const IMPERSONATION_MODES = ["read_only", "elevated_support"] as const;

export const IMPERSONATION_MODE_LABELS: Record<
  (typeof IMPERSONATION_MODES)[number],
  string
> = {
  read_only: "Read-only",
  elevated_support: "Elevated support",
};

export const PLATFORM_UI = {
  hubTitle: "Platform Admin",
  hubDescription:
    "Storaflow multi-tenant administration — staff only. Never visible to customer organizations.",
  dashboardTitle: "Platform dashboard",
  organizationsTitle: "Organizations",
  usersTitle: "Users",
  subscriptionsTitle: "Subscriptions",
  licensesTitle: "Licenses",
  supportTitle: "Support center",
  monitoringTitle: "Monitoring",
  auditTitle: "Audit logs",
  featureFlagsTitle: "Feature flags",
  settingsTitle: "System settings",
  announcementsTitle: "Announcements",
  securityTitle: "Security overview",
  searchTitle: "Global search",
  accessDenied: "Platform administrator access required.",
  impersonationBanner: "You are impersonating a customer organization.",
  reasonRequired: "A reason is required for this action.",
  emptyOrgs: "No organizations found.",
  emptyUsers: "No users found.",
  emptyAudit: "No platform audit events yet.",
  futureBackup: "Organization backup / restore — ready",
  futureImportExport: "Tenant export / import — ready",
  futureDisasterRecovery: "Disaster recovery — ready",
} as const;

/** Default timeout for impersonation sessions (minutes). */
export const DEFAULT_IMPERSONATION_TIMEOUT_MINUTES = 30;

export const IMPERSONATION_COOKIE = "storaflow_platform_impersonation_id";
