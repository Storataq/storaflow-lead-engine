/**
 * Security queries — org-scoped / self-scoped.
 */

import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_SECURITY_POLICY,
  type SecurityAlertRow,
  type SecurityAuditRow,
  type SecurityCustomRoleRow,
  type SecurityDashboardStats,
  type SecurityDeviceRow,
  type SecurityLoginAttemptRow,
  type SecurityMfaRow,
  type SecurityPolicyRow,
  type SecuritySessionRow,
  type SecuritySsoRow,
} from "@/lib/security/types";

export async function getSecurityPolicies(
  organizationId: string,
): Promise<SecurityPolicyRow | null> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("security_organization_policies")
      .select("*")
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch {
    return null;
  }
}

export async function ensureSecurityPolicies(
  organizationId: string,
  userId?: string | null,
): Promise<SecurityPolicyRow | null> {
  const existing = await getSecurityPolicies(organizationId);
  if (existing) return existing;
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("security_organization_policies")
      .upsert(
        {
          organization_id: organizationId,
          updated_by: userId ?? null,
          force_mfa: DEFAULT_SECURITY_POLICY.force_mfa,
          allow_password_login: DEFAULT_SECURITY_POLICY.allow_password_login,
          allow_passwordless: DEFAULT_SECURITY_POLICY.allow_passwordless,
          allow_magic_link: DEFAULT_SECURITY_POLICY.allow_magic_link,
          allow_passkeys: DEFAULT_SECURITY_POLICY.allow_passkeys,
          allow_oauth: DEFAULT_SECURITY_POLICY.allow_oauth,
          session_timeout_minutes:
            DEFAULT_SECURITY_POLICY.session_timeout_minutes,
          idle_timeout_minutes: DEFAULT_SECURITY_POLICY.idle_timeout_minutes,
          max_sessions: DEFAULT_SECURITY_POLICY.max_sessions,
          allowed_ip_cidrs: [],
          allowed_login_hours_json: {
            enabled: false,
            timezone: "UTC",
            windows: [],
          },
          allowed_countries_json: [],
          password_min_length: DEFAULT_SECURITY_POLICY.password_min_length,
          password_require_upper:
            DEFAULT_SECURITY_POLICY.password_require_upper,
          password_require_lower:
            DEFAULT_SECURITY_POLICY.password_require_lower,
          password_require_number:
            DEFAULT_SECURITY_POLICY.password_require_number,
          password_require_symbol:
            DEFAULT_SECURITY_POLICY.password_require_symbol,
          password_expiration_days:
            DEFAULT_SECURITY_POLICY.password_expiration_days,
          password_history_count:
            DEFAULT_SECURITY_POLICY.password_history_count,
          failed_login_threshold:
            DEFAULT_SECURITY_POLICY.failed_login_threshold,
          lockout_minutes: DEFAULT_SECURITY_POLICY.lockout_minutes,
          remember_device_days: DEFAULT_SECURITY_POLICY.remember_device_days,
          future_ldap_ready: DEFAULT_SECURITY_POLICY.future_ldap_ready,
          future_ad_ready: DEFAULT_SECURITY_POLICY.future_ad_ready,
        },
        { onConflict: "organization_id" },
      )
      .select("*")
      .single();
    if (error) throw error;
    return data;
  } catch {
    return null;
  }
}

export async function listUserSessions(
  userId: string,
): Promise<SecuritySessionRow[]> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("security_sessions")
      .select("*")
      .eq("user_id", userId)
      .is("revoked_at", null)
      .order("last_activity_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

export async function listOrgSessions(
  organizationId: string,
): Promise<SecuritySessionRow[]> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("security_sessions")
      .select("*")
      .eq("organization_id", organizationId)
      .is("revoked_at", null)
      .order("last_activity_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

export async function listUserDevices(
  userId: string,
): Promise<SecurityDeviceRow[]> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("security_devices")
      .select("*")
      .eq("user_id", userId)
      .is("revoked_at", null)
      .order("last_used_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getMfaSettings(
  userId: string,
): Promise<SecurityMfaRow | null> {
  const supabase = await createClient();
  try {
    const { data } = await supabase
      .from("security_mfa_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    return data;
  } catch {
    return null;
  }
}

export async function listSsoProviders(
  organizationId: string,
): Promise<SecuritySsoRow[]> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("security_sso_providers")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

export async function listCustomRoles(
  organizationId: string,
): Promise<SecurityCustomRoleRow[]> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("security_custom_roles")
      .select("*")
      .eq("organization_id", organizationId)
      .neq("status", "archived")
      .order("name");
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

export async function listSecurityAudit(
  organizationId: string,
  limit = 80,
): Promise<SecurityAuditRow[]> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("security_audit_events")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

export async function listSecurityAlerts(
  organizationId: string,
): Promise<SecurityAlertRow[]> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("security_alerts")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

export async function listLoginAttempts(
  organizationId: string,
  limit = 40,
): Promise<SecurityLoginAttemptRow[]> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("security_login_attempts")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

export async function searchSecurity(
  organizationId: string,
  query: string,
): Promise<{
  audit: SecurityAuditRow[];
  alerts: SecurityAlertRow[];
  devices: SecurityDeviceRow[];
  sessions: SecuritySessionRow[];
}> {
  const q = query.trim();
  const empty = {
    audit: [] as SecurityAuditRow[],
    alerts: [] as SecurityAlertRow[],
    devices: [] as SecurityDeviceRow[],
    sessions: [] as SecuritySessionRow[],
  };
  if (!q) return empty;
  const like = `%${q}%`;
  const supabase = await createClient();
  try {
    const [audit, alerts, devices, sessions] = await Promise.all([
      supabase
        .from("security_audit_events")
        .select("*")
        .eq("organization_id", organizationId)
        .ilike("description", like)
        .limit(20),
      supabase
        .from("security_alerts")
        .select("*")
        .eq("organization_id", organizationId)
        .ilike("title", like)
        .limit(20),
      supabase
        .from("security_devices")
        .select("*")
        .eq("organization_id", organizationId)
        .ilike("device_name", like)
        .limit(20),
      supabase
        .from("security_sessions")
        .select("*")
        .eq("organization_id", organizationId)
        .ilike("device_name", like)
        .limit(20),
    ]);
    return {
      audit: audit.data ?? [],
      alerts: alerts.data ?? [],
      devices: devices.data ?? [],
      sessions: sessions.data ?? [],
    };
  } catch {
    return empty;
  }
}

export async function getSecurityDashboardStats(
  organizationId: string,
): Promise<SecurityDashboardStats> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const supabase = await createClient();
  const empty: SecurityDashboardStats = {
    recentLogins: 0,
    failedLogins: 0,
    activeSessions: 0,
    devices: 0,
    mfaEnabledUsers: 0,
    openAlerts: 0,
    permissionChanges: 0,
    auditEvents: 0,
  };

  try {
    const [
      logins,
      fails,
      sessions,
      devices,
      mfa,
      alerts,
      perm,
      audit,
    ] = await Promise.all([
      supabase
        .from("security_login_attempts")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("success", true)
        .gte("created_at", since),
      supabase
        .from("security_login_attempts")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("success", false)
        .gte("created_at", since),
      supabase
        .from("security_sessions")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .is("revoked_at", null),
      supabase
        .from("security_devices")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .is("revoked_at", null),
      supabase
        .from("security_mfa_settings")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("mfa_enabled", true),
      supabase
        .from("security_alerts")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("status", "open"),
      supabase
        .from("security_audit_events")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .in("action", ["role_change", "permission_change"])
        .gte("created_at", since),
      supabase
        .from("security_audit_events")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .gte("created_at", since),
    ]);

    return {
      recentLogins: logins.count ?? 0,
      failedLogins: fails.count ?? 0,
      activeSessions: sessions.count ?? 0,
      devices: devices.count ?? 0,
      mfaEnabledUsers: mfa.count ?? 0,
      openAlerts: alerts.count ?? 0,
      permissionChanges: perm.count ?? 0,
      auditEvents: audit.count ?? 0,
    };
  } catch {
    return empty;
  }
}
