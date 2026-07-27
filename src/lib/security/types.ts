import type { Database } from "@/types/supabase";

export type SecurityPolicyRow =
  Database["public"]["Tables"]["security_organization_policies"]["Row"];
export type SecuritySessionRow =
  Database["public"]["Tables"]["security_sessions"]["Row"];
export type SecurityDeviceRow =
  Database["public"]["Tables"]["security_devices"]["Row"];
export type SecurityMfaRow =
  Database["public"]["Tables"]["security_mfa_settings"]["Row"];
export type SecuritySsoRow =
  Database["public"]["Tables"]["security_sso_providers"]["Row"];
export type SecurityCustomRoleRow =
  Database["public"]["Tables"]["security_custom_roles"]["Row"];
export type SecurityAuditRow =
  Database["public"]["Tables"]["security_audit_events"]["Row"];
export type SecurityAlertRow =
  Database["public"]["Tables"]["security_alerts"]["Row"];
export type SecurityLoginAttemptRow =
  Database["public"]["Tables"]["security_login_attempts"]["Row"];

export type SecurityDashboardStats = {
  recentLogins: number;
  failedLogins: number;
  activeSessions: number;
  devices: number;
  mfaEnabledUsers: number;
  openAlerts: number;
  permissionChanges: number;
  auditEvents: number;
};

export const DEFAULT_SECURITY_POLICY = {
  force_mfa: false,
  allow_password_login: true,
  allow_passwordless: false,
  allow_magic_link: false,
  allow_passkeys: false,
  allow_oauth: false,
  session_timeout_minutes: 10080,
  idle_timeout_minutes: 480,
  max_sessions: 10,
  allowed_ip_cidrs: [] as string[],
  password_min_length: 8,
  password_require_upper: true,
  password_require_lower: true,
  password_require_number: true,
  password_require_symbol: false,
  password_expiration_days: null as number | null,
  password_history_count: 0,
  failed_login_threshold: 5,
  lockout_minutes: 15,
  remember_device_days: 30,
  future_ldap_ready: true,
  future_ad_ready: true,
};
