/**
 * Phase 26E — Enterprise Security constants (label catalog = i18n pattern).
 */

export const ORG_SECURITY_ROLES = ["owner", "admin", "member", "viewer"] as const;
export type OrgSecurityRole = (typeof ORG_SECURITY_ROLES)[number];

export const ORG_SECURITY_ROLE_LABELS: Record<OrgSecurityRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

export const SECURITY_PERMISSION_RESOURCES = [
  "companies",
  "contacts",
  "deals",
  "tasks",
  "campaigns",
  "analytics",
  "reports",
  "copilot",
  "marketplace",
  "api",
  "white_label",
  "billing",
  "settings",
  "users",
  "organization",
  "security",
] as const;

export type SecurityPermissionResource =
  (typeof SECURITY_PERMISSION_RESOURCES)[number];

export const SECURITY_PERMISSION_ACTIONS = [
  "view",
  "create",
  "update",
  "delete",
  "export",
  "manage",
] as const;

export type SecurityPermissionAction =
  (typeof SECURITY_PERMISSION_ACTIONS)[number];

export const SECURITY_PERMISSION_RESOURCE_LABELS: Record<
  SecurityPermissionResource,
  string
> = {
  companies: "Companies",
  contacts: "Contacts",
  deals: "Deals",
  tasks: "Tasks",
  campaigns: "Campaigns",
  analytics: "Analytics",
  reports: "Reports",
  copilot: "AI Copilot",
  marketplace: "Marketplace",
  api: "API",
  white_label: "White Label",
  billing: "Billing",
  settings: "Settings",
  users: "Users",
  organization: "Organization",
  security: "Security",
};

export const SSO_PROVIDER_TYPES = [
  "saml",
  "oidc",
  "google_workspace",
  "entra_id",
  "okta",
  "auth0",
  "onelogin",
  "ldap",
  "active_directory",
  "custom",
] as const;

export type SsoProviderType = (typeof SSO_PROVIDER_TYPES)[number];

export const SSO_PROVIDER_LABELS: Record<SsoProviderType, string> = {
  saml: "SAML 2.0",
  oidc: "OpenID Connect",
  google_workspace: "Google Workspace",
  entra_id: "Microsoft Entra ID",
  okta: "Okta",
  auth0: "Auth0",
  onelogin: "OneLogin",
  ldap: "LDAP (future)",
  active_directory: "Active Directory (future)",
  custom: "Custom",
};

export const SECURITY_ALERT_TYPES = [
  "new_device",
  "new_country",
  "failed_login_threshold",
  "role_escalation",
  "admin_change",
  "large_export",
  "mass_delete",
  "api_abuse",
  "impossible_travel",
  "brute_force",
  "suspicious_ip",
  "mfa_disabled",
] as const;

export type SecurityAlertType = (typeof SECURITY_ALERT_TYPES)[number];

export const SECURITY_ALERT_TYPE_LABELS: Record<SecurityAlertType, string> = {
  new_device: "New device",
  new_country: "New country",
  failed_login_threshold: "Failed login threshold",
  role_escalation: "Role escalation",
  admin_change: "Admin change",
  large_export: "Large export",
  mass_delete: "Mass delete",
  api_abuse: "API abuse",
  impossible_travel: "Impossible travel",
  brute_force: "Brute force",
  suspicious_ip: "Suspicious IP",
  mfa_disabled: "MFA disabled",
};

export const SECURITY_ALERT_SEVERITIES = [
  "low",
  "medium",
  "high",
  "critical",
] as const;

export const SECURITY_ALERT_SEVERITY_LABELS: Record<
  (typeof SECURITY_ALERT_SEVERITIES)[number],
  string
> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const SECURITY_AUDIT_ACTIONS = [
  "login",
  "logout",
  "failed_login",
  "password_change",
  "password_reset",
  "mfa_enabled",
  "mfa_disabled",
  "role_change",
  "permission_change",
  "api_key_change",
  "organization_change",
  "white_label_change",
  "security_settings",
  "export",
  "import",
  "bulk_operation",
  "session_revoked",
  "device_revoked",
  "account_locked",
  "account_unlocked",
  "sso_configured",
] as const;

export type SecurityAuditAction = (typeof SECURITY_AUDIT_ACTIONS)[number];

export const SECURITY_AUDIT_ACTION_LABELS: Record<SecurityAuditAction, string> =
  {
    login: "Login",
    logout: "Logout",
    failed_login: "Failed login",
    password_change: "Password change",
    password_reset: "Password reset",
    mfa_enabled: "MFA enabled",
    mfa_disabled: "MFA disabled",
    role_change: "Role change",
    permission_change: "Permission change",
    api_key_change: "API key change",
    organization_change: "Organization change",
    white_label_change: "White label change",
    security_settings: "Security settings",
    export: "Export",
    import: "Import",
    bulk_operation: "Bulk operation",
    session_revoked: "Session revoked",
    device_revoked: "Device revoked",
    account_locked: "Account locked",
    account_unlocked: "Account unlocked",
    sso_configured: "SSO configured",
  };

export const ROLE_TEMPLATES = [
  {
    code: "sales_rep",
    name: "Sales representative",
    permissions: {
      companies: ["view", "create", "update"],
      contacts: ["view", "create", "update"],
      deals: ["view", "create", "update"],
      tasks: ["view", "create", "update"],
      campaigns: ["view"],
      analytics: ["view"],
    },
  },
  {
    code: "marketing",
    name: "Marketing",
    permissions: {
      campaigns: ["view", "create", "update", "export"],
      contacts: ["view", "export"],
      analytics: ["view"],
      reports: ["view", "create"],
    },
  },
  {
    code: "security_admin",
    name: "Security admin",
    permissions: {
      security: ["view", "manage"],
      users: ["view", "manage"],
      settings: ["view", "manage"],
      api: ["view", "manage"],
      organization: ["view"],
    },
  },
] as const;

export const SECURITY_UI = {
  hubTitle: "Security",
  hubDescription:
    "Identity, MFA, sessions, devices, policies, RBAC, audit, and alerts — org-scoped.",
  dashboardTitle: "Security dashboard",
  sessionsTitle: "Sessions",
  devicesTitle: "Devices",
  mfaTitle: "Multi-factor authentication",
  ssoTitle: "Single sign-on",
  policiesTitle: "Access policies",
  rolesTitle: "Roles & permissions",
  auditTitle: "Audit log",
  alertsTitle: "Security alerts",
  adminTitle: "Admin tools",
  emptySessions: "No active sessions tracked yet.",
  emptyDevices: "No devices recorded yet.",
  emptyAudit: "No security audit events yet.",
  emptyAlerts: "No open security alerts.",
  terminateSession: "Terminate",
  terminateOthers: "Terminate other sessions",
  revokeDevice: "Revoke device",
  enableMfa: "Enable authenticator MFA",
  disableMfa: "Disable MFA",
  forceLogout: "Force logout user",
  futurePasskeys: "Passkeys — ready",
  futureMagicLink: "Magic link — ready",
  futureSms: "SMS MFA — ready",
  futureLdap: "LDAP / Active Directory — ready",
} as const;
