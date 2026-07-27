"use server";

import { createHash, randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { createSecurityAlert, logSecurityAudit } from "@/lib/security/audit";
import {
  deviceFingerprintFrom,
  generateRecoveryCodes,
  hashToken,
  parseUserAgent,
} from "@/lib/security/device";
import {
  ROLE_TEMPLATES,
  SSO_PROVIDER_TYPES,
} from "@/lib/security/constants";
import { isSecurityAdmin } from "@/lib/security/permissions";
import { ensureSecurityPolicies } from "@/lib/security/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { createClient } from "@/lib/supabase/server";
import { toUserFacingError } from "@/lib/ui/user-facing-error";
import type { Json } from "@/types/supabase";

export type SecurityActionResult = {
  success: boolean;
  message: string;
  id?: string;
  recoveryCodes?: string[];
};

function revalidateSecurity() {
  revalidatePath("/security");
  revalidatePath("/security/sessions");
  revalidatePath("/security/devices");
  revalidatePath("/security/mfa");
  revalidatePath("/security/sso");
  revalidatePath("/security/policies");
  revalidatePath("/security/roles");
  revalidatePath("/security/audit");
  revalidatePath("/security/alerts");
  revalidatePath("/settings");
}

async function requestMeta() {
  const h = await headers();
  const userAgent = h.get("user-agent") ?? "";
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    null;
  const parsed = parseUserAgent(userAgent);
  const fingerprint = deviceFingerprintFrom(userAgent, ip);
  return { userAgent, ip, ...parsed, fingerprint };
}

export async function recordLoginAttemptAction(input: {
  email: string;
  success: boolean;
  userId?: string | null;
  organizationId?: string | null;
  failureReason?: string | null;
}): Promise<void> {
  try {
    const { createServiceClient } = await import("@/lib/supabase/admin");
    const supabase = createServiceClient();
    const meta = await requestMeta();
    const suspicion: string[] = [];
    if (!input.success) suspicion.push("failed_login");

    await supabase.from("security_login_attempts").insert({
      organization_id: input.organizationId ?? null,
      email: input.email,
      user_id: input.userId ?? null,
      success: input.success,
      failure_reason: input.failureReason ?? null,
      ip_address: meta.ip,
      user_agent: meta.userAgent,
      device_fingerprint: meta.fingerprint,
      is_suspicious: !input.success,
      suspicion_flags: suspicion as unknown as Json,
    });

    if (input.organizationId || input.userId) {
      await logSecurityAudit(supabase, {
        organizationId: input.organizationId,
        actorUserId: input.userId,
        action: input.success ? "login" : "failed_login",
        description: input.success
          ? `Successful login for ${input.email}`
          : `Failed login for ${input.email}`,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
        metadata: { reason: input.failureReason },
      });
    }
  } catch {
    /* best-effort */
  }
}

export async function registerSessionAfterLoginAction(input: {
  userId: string;
  organizationId?: string | null;
  email?: string | null;
}): Promise<void> {
  try {
    const supabase = await createClient();
    const meta = await requestMeta();
    const token = randomBytes(24).toString("hex");
    const tokenHash = await hashToken(token);

    await supabase
      .from("security_sessions")
      .update({ is_current: false })
      .eq("user_id", input.userId)
      .is("revoked_at", null);

    await supabase.from("security_sessions").insert({
      organization_id: input.organizationId ?? null,
      user_id: input.userId,
      session_token_hash: tokenHash,
      browser: meta.browser,
      operating_system: meta.operatingSystem,
      device_name: meta.deviceName,
      ip_address: meta.ip,
      user_agent: meta.userAgent,
      is_current: true,
      metadata_json: { email: input.email ?? null } as Json,
    });

    const { data: existingDevice } = await supabase
      .from("security_devices")
      .select("id, is_trusted")
      .eq("user_id", input.userId)
      .eq("device_fingerprint", meta.fingerprint)
      .maybeSingle();

    if (existingDevice) {
      await supabase
        .from("security_devices")
        .update({
          last_used_at: new Date().toISOString(),
          device_name: meta.deviceName,
          browser: meta.browser,
          platform: meta.platform,
          organization_id: input.organizationId ?? null,
        })
        .eq("id", existingDevice.id);
    } else {
      await supabase.from("security_devices").insert({
        organization_id: input.organizationId ?? null,
        user_id: input.userId,
        device_fingerprint: meta.fingerprint,
        device_name: meta.deviceName,
        browser: meta.browser,
        platform: meta.platform,
        is_trusted: false,
      });

      if (input.organizationId) {
        await createSecurityAlert(supabase, {
          organizationId: input.organizationId,
          alertType: "new_device",
          title: "New device detected",
          body: `${meta.deviceName} · ${meta.ip ?? "unknown IP"}`,
          severity: "medium",
        });
      }
    }
  } catch {
    /* best-effort */
  }
}

export async function terminateSessionAction(
  sessionId: string,
): Promise<SecurityActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const supabase = await createClient();
    const { data: session } = await supabase
      .from("security_sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();
    if (!session) return { success: false, message: "Session not found." };

    const canRevoke =
      session.user_id === context.membership.user_id ||
      isSecurityAdmin(context.membership.role);
    if (!canRevoke) return { success: false, message: "Not allowed." };

    const { error } = await supabase
      .from("security_sessions")
      .update({
        revoked_at: new Date().toISOString(),
        revoke_reason: "manual",
        is_current: false,
      })
      .eq("id", sessionId);
    if (error) throw error;

    await logSecurityAudit(supabase, {
      organizationId: context.organization.id,
      actorUserId: context.membership.user_id,
      action: "session_revoked",
      entityType: "session",
      entityId: sessionId,
      description: "Session terminated",
    });

    revalidateSecurity();
    return { success: true, message: "Session terminated." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not terminate session."),
    };
  }
}

export async function terminateOtherSessionsAction(): Promise<SecurityActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const supabase = await createClient();
    const { error } = await supabase
      .from("security_sessions")
      .update({
        revoked_at: new Date().toISOString(),
        revoke_reason: "terminate_others",
        is_current: false,
      })
      .eq("user_id", context.membership.user_id)
      .eq("is_current", false)
      .is("revoked_at", null);
    if (error) throw error;

    await logSecurityAudit(supabase, {
      organizationId: context.organization.id,
      actorUserId: context.membership.user_id,
      action: "session_revoked",
      description: "Terminated all other sessions",
    });

    revalidateSecurity();
    return { success: true, message: "Other sessions terminated." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not terminate sessions."),
    };
  }
}

export async function revokeDeviceAction(
  deviceId: string,
): Promise<SecurityActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const supabase = await createClient();
    const { data: device } = await supabase
      .from("security_devices")
      .select("*")
      .eq("id", deviceId)
      .maybeSingle();
    if (!device) return { success: false, message: "Device not found." };
    const canRevoke =
      device.user_id === context.membership.user_id ||
      isSecurityAdmin(context.membership.role);
    if (!canRevoke) return { success: false, message: "Not allowed." };

    const { error } = await supabase
      .from("security_devices")
      .update({ revoked_at: new Date().toISOString(), is_trusted: false })
      .eq("id", deviceId);
    if (error) throw error;

    await logSecurityAudit(supabase, {
      organizationId: context.organization.id,
      actorUserId: context.membership.user_id,
      action: "device_revoked",
      entityType: "device",
      entityId: deviceId,
      description: "Device revoked",
    });

    revalidateSecurity();
    return { success: true, message: "Device revoked." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not revoke device."),
    };
  }
}

export async function trustDeviceAction(
  deviceId: string,
): Promise<SecurityActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const supabase = await createClient();
    const { error } = await supabase
      .from("security_devices")
      .update({ is_trusted: true })
      .eq("id", deviceId)
      .eq("user_id", context.membership.user_id);
    if (error) throw error;
    revalidateSecurity();
    return { success: true, message: "Device trusted." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not trust device."),
    };
  }
}

export async function enableMfaAction(): Promise<SecurityActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const supabase = await createClient();
    const secret = randomBytes(20).toString("base64url");
    const codes = generateRecoveryCodes(8);
    const hashes = codes.map((c) =>
      createHash("sha256").update(c).digest("hex"),
    );

    await supabase.from("security_mfa_settings").upsert(
      {
        user_id: context.membership.user_id,
        organization_id: context.organization.id,
        mfa_enabled: true,
        totp_enabled: true,
        totp_secret_encrypted: secret,
        email_backup_enabled: true,
        sms_ready: true,
        enabled_at: new Date().toISOString(),
        disabled_at: null,
      },
      { onConflict: "user_id" },
    );

    await supabase
      .from("security_mfa_recovery_codes")
      .delete()
      .eq("user_id", context.membership.user_id);

    await supabase.from("security_mfa_recovery_codes").insert(
      hashes.map((code_hash) => ({
        user_id: context.membership.user_id,
        code_hash,
      })),
    );

    await logSecurityAudit(supabase, {
      organizationId: context.organization.id,
      actorUserId: context.membership.user_id,
      action: "mfa_enabled",
      description: "Authenticator MFA enabled",
    });

    revalidateSecurity();
    return {
      success: true,
      message: "MFA enabled. Store recovery codes securely.",
      recoveryCodes: codes,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not enable MFA."),
    };
  }
}

export async function disableMfaAction(): Promise<SecurityActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    const supabase = await createClient();
    await supabase
      .from("security_mfa_settings")
      .update({
        mfa_enabled: false,
        totp_enabled: false,
        disabled_at: new Date().toISOString(),
      })
      .eq("user_id", context.membership.user_id);

    await logSecurityAudit(supabase, {
      organizationId: context.organization.id,
      actorUserId: context.membership.user_id,
      action: "mfa_disabled",
      description: "MFA disabled",
    });

    await createSecurityAlert(supabase, {
      organizationId: context.organization.id,
      alertType: "mfa_disabled",
      title: "MFA disabled",
      body: "A user disabled multi-factor authentication.",
      severity: "high",
    });

    revalidateSecurity();
    return { success: true, message: "MFA disabled." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not disable MFA."),
    };
  }
}

export async function saveSecurityPoliciesAction(input: {
  forceMfa?: boolean;
  sessionTimeoutMinutes?: number;
  idleTimeoutMinutes?: number;
  maxSessions?: number;
  passwordMinLength?: number;
  passwordRequireUpper?: boolean;
  passwordRequireLower?: boolean;
  passwordRequireNumber?: boolean;
  passwordRequireSymbol?: boolean;
  passwordExpirationDays?: number | null;
  passwordHistoryCount?: number;
  failedLoginThreshold?: number;
  lockoutMinutes?: number;
  allowedIpCidrs?: string[];
  allowMagicLink?: boolean;
  allowPasskeys?: boolean;
  allowOauth?: boolean;
  allowPasswordless?: boolean;
}): Promise<SecurityActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!isSecurityAdmin(context.membership.role)) {
      return { success: false, message: "Only admins can edit security policies." };
    }

    await ensureSecurityPolicies(
      context.organization.id,
      context.membership.user_id,
    );

    const supabase = await createClient();
    const { error } = await supabase
      .from("security_organization_policies")
      .update({
        force_mfa: input.forceMfa,
        session_timeout_minutes: input.sessionTimeoutMinutes,
        idle_timeout_minutes: input.idleTimeoutMinutes,
        max_sessions: input.maxSessions,
        password_min_length: input.passwordMinLength,
        password_require_upper: input.passwordRequireUpper,
        password_require_lower: input.passwordRequireLower,
        password_require_number: input.passwordRequireNumber,
        password_require_symbol: input.passwordRequireSymbol,
        password_expiration_days: input.passwordExpirationDays ?? null,
        password_history_count: input.passwordHistoryCount,
        failed_login_threshold: input.failedLoginThreshold,
        lockout_minutes: input.lockoutMinutes,
        allowed_ip_cidrs: (input.allowedIpCidrs ?? []) as unknown as Json,
        allow_magic_link: input.allowMagicLink,
        allow_passkeys: input.allowPasskeys,
        allow_oauth: input.allowOauth,
        allow_passwordless: input.allowPasswordless,
        updated_by: context.membership.user_id,
      })
      .eq("organization_id", context.organization.id);
    if (error) throw error;

    await logSecurityAudit(supabase, {
      organizationId: context.organization.id,
      actorUserId: context.membership.user_id,
      action: "security_settings",
      description: "Security policies updated",
    });

    revalidateSecurity();
    return { success: true, message: "Security policies saved." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not save policies."),
    };
  }
}

export async function createSsoProviderAction(input: {
  providerType: string;
  displayName: string;
  issuer?: string;
  clientId?: string;
  metadataUrl?: string;
}): Promise<SecurityActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!isSecurityAdmin(context.membership.role)) {
      return { success: false, message: "Only admins can configure SSO." };
    }

    const providerType = z.enum(SSO_PROVIDER_TYPES).parse(input.providerType);
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("security_sso_providers")
      .insert({
        organization_id: context.organization.id,
        provider_type: providerType,
        display_name: input.displayName.trim(),
        issuer: input.issuer ?? null,
        client_id: input.clientId ?? null,
        metadata_url: input.metadataUrl ?? null,
        status: "draft",
        created_by: context.membership.user_id,
      })
      .select("id")
      .single();
    if (error) throw error;

    await logSecurityAudit(supabase, {
      organizationId: context.organization.id,
      actorUserId: context.membership.user_id,
      action: "sso_configured",
      entityType: "sso_provider",
      entityId: data.id,
      description: `SSO provider drafted: ${input.displayName}`,
    });

    revalidateSecurity();
    return { success: true, message: "SSO provider saved as draft.", id: data.id };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not save SSO provider."),
    };
  }
}

export async function createCustomRoleAction(input: {
  code: string;
  name: string;
  description?: string;
  fromTemplate?: string;
}): Promise<SecurityActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!isSecurityAdmin(context.membership.role)) {
      return { success: false, message: "Only admins can manage roles." };
    }

    const template = ROLE_TEMPLATES.find((t) => t.code === input.fromTemplate);
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("security_custom_roles")
      .insert({
        organization_id: context.organization.id,
        code: input.code.trim().toLowerCase(),
        name: input.name.trim(),
        description: input.description ?? "",
        is_template: Boolean(template),
        permissions_json: (template?.permissions ?? {}) as unknown as Json,
        created_by: context.membership.user_id,
      })
      .select("id")
      .single();
    if (error) throw error;

    await logSecurityAudit(supabase, {
      organizationId: context.organization.id,
      actorUserId: context.membership.user_id,
      action: "permission_change",
      entityType: "custom_role",
      entityId: data.id,
      description: `Custom role created: ${input.name}`,
    });

    revalidateSecurity();
    return { success: true, message: "Role created.", id: data.id };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not create role."),
    };
  }
}

export async function acknowledgeAlertAction(
  alertId: string,
): Promise<SecurityActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!isSecurityAdmin(context.membership.role)) {
      return { success: false, message: "Only admins can manage alerts." };
    }
    const supabase = await createClient();
    const { error } = await supabase
      .from("security_alerts")
      .update({ status: "acknowledged" })
      .eq("id", alertId)
      .eq("organization_id", context.organization.id);
    if (error) throw error;
    revalidateSecurity();
    return { success: true, message: "Alert acknowledged." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not update alert."),
    };
  }
}

export async function lockUserAccountAction(input: {
  userId: string;
  reason?: string;
}): Promise<SecurityActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!isSecurityAdmin(context.membership.role)) {
      return { success: false, message: "Only admins can lock accounts." };
    }
    const supabase = await createClient();
    const { error } = await supabase.from("security_account_locks").upsert(
      {
        organization_id: context.organization.id,
        user_id: input.userId,
        reason: input.reason ?? "Locked by admin",
        locked_by: context.membership.user_id,
        locked_at: new Date().toISOString(),
        unlocked_at: null,
        unlocked_by: null,
      },
      { onConflict: "organization_id,user_id" },
    );
    if (error) throw error;

    await supabase
      .from("security_sessions")
      .update({
        revoked_at: new Date().toISOString(),
        revoke_reason: "account_locked",
        is_current: false,
      })
      .eq("user_id", input.userId)
      .is("revoked_at", null);

    await logSecurityAudit(supabase, {
      organizationId: context.organization.id,
      actorUserId: context.membership.user_id,
      action: "account_locked",
      entityType: "user",
      entityId: input.userId,
      description: "Account locked and sessions revoked",
    });

    revalidateSecurity();
    return { success: true, message: "Account locked." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not lock account."),
    };
  }
}

export async function unlockUserAccountAction(
  userId: string,
): Promise<SecurityActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!isSecurityAdmin(context.membership.role)) {
      return { success: false, message: "Only admins can unlock accounts." };
    }
    const supabase = await createClient();
    const { error } = await supabase
      .from("security_account_locks")
      .update({
        unlocked_at: new Date().toISOString(),
        unlocked_by: context.membership.user_id,
      })
      .eq("organization_id", context.organization.id)
      .eq("user_id", userId);
    if (error) throw error;

    await logSecurityAudit(supabase, {
      organizationId: context.organization.id,
      actorUserId: context.membership.user_id,
      action: "account_unlocked",
      entityType: "user",
      entityId: userId,
      description: "Account unlocked",
    });

    revalidateSecurity();
    return { success: true, message: "Account unlocked." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not unlock account."),
    };
  }
}

export async function adminResetUserMfaAction(
  userId: string,
): Promise<SecurityActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!isSecurityAdmin(context.membership.role)) {
      return { success: false, message: "Only admins can reset MFA." };
    }
    const supabase = await createClient();
    await supabase
      .from("security_mfa_settings")
      .update({
        mfa_enabled: false,
        totp_enabled: false,
        disabled_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("organization_id", context.organization.id);

    await logSecurityAudit(supabase, {
      organizationId: context.organization.id,
      actorUserId: context.membership.user_id,
      action: "mfa_disabled",
      entityType: "user",
      entityId: userId,
      description: "Admin reset user MFA",
    });

    revalidateSecurity();
    return { success: true, message: "User MFA reset." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not reset MFA."),
    };
  }
}
