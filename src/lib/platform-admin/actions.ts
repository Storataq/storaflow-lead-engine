"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  requirePlatformAdmin,
  platformServiceClient,
} from "@/lib/platform-admin/auth";
import {
  DEFAULT_IMPERSONATION_TIMEOUT_MINUTES,
  IMPERSONATION_COOKIE,
  PLATFORM_UI,
} from "@/lib/platform-admin/constants";
import { hasPlatformPermission } from "@/lib/platform-admin/permissions";
import { toUserFacingError } from "@/lib/ui/user-facing-error";
import type { Json } from "@/types/supabase";

export type PlatformActionResult = {
  success: boolean;
  message: string;
  id?: string;
};

async function audit(input: {
  action: string;
  description?: string;
  affectedOrganizationId?: string | null;
  affectedUserId?: string | null;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
}) {
  const admin = await requirePlatformAdmin();
  const h = await headers();
  try {
    const supabase = await platformServiceClient();
    await supabase.from("platform_audit_events").insert({
      admin_user_id: admin.userId,
      admin_email: admin.email,
      action: input.action,
      description: input.description ?? "",
      affected_organization_id: input.affectedOrganizationId ?? null,
      affected_user_id: input.affectedUserId ?? null,
      old_value_json: (input.oldValue ?? {}) as Json,
      new_value_json: (input.newValue ?? {}) as Json,
      ip_address: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      user_agent: h.get("user-agent"),
    });
  } catch {
    // ignore pre-migration
  }
}

function revalidatePlatform() {
  revalidatePath("/platform-admin");
  revalidatePath("/platform-admin/organizations");
  revalidatePath("/platform-admin/users");
  revalidatePath("/platform-admin/subscriptions");
  revalidatePath("/platform-admin/licenses");
  revalidatePath("/platform-admin/feature-flags");
  revalidatePath("/platform-admin/announcements");
  revalidatePath("/platform-admin/settings");
  revalidatePath("/platform-admin/audit");
  revalidatePath("/platform-admin/support");
  revalidatePath("/platform-admin/monitoring");
}

export async function setOrganizationLifecycleAction(input: {
  organizationId: string;
  status: "active" | "suspended" | "archived" | "deleted";
}): Promise<PlatformActionResult> {
  try {
    const admin = await requirePlatformAdmin();
    if (!hasPlatformPermission(admin.role, "organizations:manage")) {
      return { success: false, message: PLATFORM_UI.accessDenied };
    }
    const parsed = z
      .object({
        organizationId: z.string().uuid(),
        status: z.enum(["active", "suspended", "archived", "deleted"]),
      })
      .parse(input);

    const supabase = await platformServiceClient();
    const { data: before } = await supabase
      .from("organizations")
      .select("lifecycle_status")
      .eq("id", parsed.organizationId)
      .maybeSingle();

    const patch: {
      lifecycle_status: typeof parsed.status;
      suspended_at?: string | null;
      archived_at?: string | null;
      deleted_at?: string | null;
    } = {
      lifecycle_status: parsed.status,
    };
    if (parsed.status === "suspended") {
      patch.suspended_at = new Date().toISOString();
    }
    if (parsed.status === "archived") {
      patch.archived_at = new Date().toISOString();
    }
    if (parsed.status === "deleted") {
      patch.deleted_at = new Date().toISOString();
    }
    if (parsed.status === "active") {
      patch.suspended_at = null;
      patch.archived_at = null;
      patch.deleted_at = null;
    }

    const { error } = await supabase
      .from("organizations")
      .update(patch)
      .eq("id", parsed.organizationId);
    if (error) throw error;

    await audit({
      action: `org_${parsed.status}`,
      description: `Organization set to ${parsed.status}`,
      affectedOrganizationId: parsed.organizationId,
      oldValue: { lifecycle_status: before?.lifecycle_status },
      newValue: { lifecycle_status: parsed.status },
    });
    revalidatePlatform();
    return { success: true, message: `Organization ${parsed.status}.` };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not update organization."),
    };
  }
}

export async function transferOwnershipAction(input: {
  organizationId: string;
  newOwnerUserId: string;
}): Promise<PlatformActionResult> {
  try {
    const admin = await requirePlatformAdmin();
    if (!hasPlatformPermission(admin.role, "organizations:manage")) {
      return { success: false, message: PLATFORM_UI.accessDenied };
    }
    const parsed = z
      .object({
        organizationId: z.string().uuid(),
        newOwnerUserId: z.string().uuid(),
      })
      .parse(input);

    const supabase = await platformServiceClient();
    const { data: members } = await supabase
      .from("organization_members")
      .select("*")
      .eq("organization_id", parsed.organizationId);

    const currentOwner = (members ?? []).find((m) => m.role === "owner");
    const target = (members ?? []).find(
      (m) => m.user_id === parsed.newOwnerUserId,
    );
    if (!target) {
      return { success: false, message: "Target user is not a member." };
    }

    if (currentOwner) {
      await supabase
        .from("organization_members")
        .update({ role: "admin" })
        .eq("id", currentOwner.id);
    }
    await supabase
      .from("organization_members")
      .update({ role: "owner" })
      .eq("id", target.id);
    await supabase
      .from("organizations")
      .update({ created_by: parsed.newOwnerUserId })
      .eq("id", parsed.organizationId);

    await audit({
      action: "ownership_transferred",
      description: "Ownership transferred",
      affectedOrganizationId: parsed.organizationId,
      affectedUserId: parsed.newOwnerUserId,
      oldValue: { owner: currentOwner?.user_id },
      newValue: { owner: parsed.newOwnerUserId },
    });
    revalidatePlatform();
    return { success: true, message: "Ownership transferred." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not transfer ownership."),
    };
  }
}

export async function setUserControlAction(input: {
  userId: string;
  status?: "active" | "suspended" | "locked";
  forcePasswordReset?: boolean;
  mfaDisabled?: boolean;
  email?: string;
  fullName?: string;
}): Promise<PlatformActionResult> {
  try {
    const admin = await requirePlatformAdmin();
    if (!hasPlatformPermission(admin.role, "users:manage")) {
      return { success: false, message: PLATFORM_UI.accessDenied };
    }
    const supabase = await platformServiceClient();
    await supabase.from("platform_user_controls").upsert(
      {
        user_id: input.userId,
        status: input.status ?? "active",
        force_password_reset: input.forcePasswordReset ?? false,
        mfa_disabled_by_admin: input.mfaDisabled ?? false,
        email: input.email ?? null,
        full_name: input.fullName ?? null,
        updated_by: admin.userId,
      },
      { onConflict: "user_id" },
    );
    await audit({
      action: "user_control_updated",
      description: "User control updated",
      affectedUserId: input.userId,
      newValue: input as Record<string, unknown>,
    });
    revalidatePlatform();
    return { success: true, message: "User updated." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not update user."),
    };
  }
}

export async function startImpersonationAction(input: {
  organizationId: string;
  mode: "read_only" | "elevated_support";
  reason: string;
  targetUserId?: string;
}): Promise<PlatformActionResult> {
  try {
    const admin = await requirePlatformAdmin();
    const perm =
      input.mode === "elevated_support"
        ? "impersonate:elevated"
        : "impersonate:read_only";
    if (!hasPlatformPermission(admin.role, perm)) {
      return { success: false, message: PLATFORM_UI.accessDenied };
    }
    const reason = input.reason.trim();
    if (!reason) {
      return { success: false, message: PLATFORM_UI.reasonRequired };
    }

    const supabase = await platformServiceClient();
    // End any existing session
    await supabase
      .from("platform_impersonation_sessions")
      .update({ ended_at: new Date().toISOString() })
      .eq("admin_user_id", admin.userId)
      .is("ended_at", null);

    const timeoutMin = DEFAULT_IMPERSONATION_TIMEOUT_MINUTES;
    const expires = new Date(Date.now() + timeoutMin * 60_000);
    const h = await headers();
    const { data, error } = await supabase
      .from("platform_impersonation_sessions")
      .insert({
        admin_user_id: admin.userId,
        target_organization_id: input.organizationId,
        target_user_id: input.targetUserId ?? null,
        mode: input.mode,
        reason,
        expires_at: expires.toISOString(),
        ip_address: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        user_agent: h.get("user-agent"),
      })
      .select("id")
      .single();
    if (error) throw error;

    const cookieStore = await cookies();
    cookieStore.set(IMPERSONATION_COOKIE, data.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: timeoutMin * 60,
    });

    await audit({
      action: "impersonation_started",
      description: `Impersonation (${input.mode}): ${reason}`,
      affectedOrganizationId: input.organizationId,
      affectedUserId: input.targetUserId,
      newValue: { mode: input.mode, sessionId: data.id },
    });
    revalidatePlatform();
    return {
      success: true,
      message: "Impersonation started.",
      id: data.id,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not start impersonation."),
    };
  }
}

export async function endImpersonationAction(): Promise<PlatformActionResult> {
  try {
    const admin = await requirePlatformAdmin();
    const supabase = await platformServiceClient();
    await supabase
      .from("platform_impersonation_sessions")
      .update({ ended_at: new Date().toISOString() })
      .eq("admin_user_id", admin.userId)
      .is("ended_at", null);

    const cookieStore = await cookies();
    cookieStore.delete(IMPERSONATION_COOKIE);

    await audit({
      action: "impersonation_ended",
      description: "Impersonation ended",
    });
    revalidatePlatform();
    return { success: true, message: "Impersonation ended." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not end impersonation."),
    };
  }
}

export async function upsertFeatureFlagAction(input: {
  flagKey: string;
  name: string;
  description?: string;
  scope?: string;
  enabled: boolean;
  emergencyDisabled?: boolean;
}): Promise<PlatformActionResult> {
  try {
    const admin = await requirePlatformAdmin();
    if (!hasPlatformPermission(admin.role, "feature_flags:manage")) {
      return { success: false, message: PLATFORM_UI.accessDenied };
    }
    const supabase = await platformServiceClient();
    const { data, error } = await supabase
      .from("platform_feature_flags")
      .upsert(
        {
          flag_key: input.flagKey,
          name: input.name,
          description: input.description ?? "",
          scope: input.scope ?? "global",
          enabled: input.enabled,
          emergency_disabled: input.emergencyDisabled ?? false,
        },
        { onConflict: "flag_key" },
      )
      .select("id")
      .single();
    if (error) throw error;
    await audit({
      action: "feature_flag_upserted",
      description: `Flag ${input.flagKey}`,
      newValue: input as Record<string, unknown>,
    });
    revalidatePlatform();
    return { success: true, message: "Feature flag saved.", id: data.id };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not save feature flag."),
    };
  }
}

export async function publishAnnouncementAction(input: {
  title: string;
  body: string;
  announcementType: string;
  targetScope?: string;
}): Promise<PlatformActionResult> {
  try {
    const admin = await requirePlatformAdmin();
    if (!hasPlatformPermission(admin.role, "announcements:manage")) {
      return { success: false, message: PLATFORM_UI.accessDenied };
    }
    const supabase = await platformServiceClient();
    const { data, error } = await supabase
      .from("platform_announcements")
      .insert({
        title: input.title,
        body: input.body,
        announcement_type: input.announcementType,
        target_scope: input.targetScope ?? "all",
        status: "published",
        published_at: new Date().toISOString(),
        created_by: admin.userId,
      })
      .select("id")
      .single();
    if (error) throw error;
    await audit({
      action: "announcement_published",
      description: input.title,
      newValue: { id: data.id },
    });
    revalidatePlatform();
    return { success: true, message: "Announcement published.", id: data.id };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not publish announcement."),
    };
  }
}

export async function savePlatformSettingAction(input: {
  key: string;
  value: unknown;
  description?: string;
}): Promise<PlatformActionResult> {
  try {
    const admin = await requirePlatformAdmin();
    if (!hasPlatformPermission(admin.role, "settings:manage")) {
      return { success: false, message: PLATFORM_UI.accessDenied };
    }
    const supabase = await platformServiceClient();
    await supabase.from("platform_settings").upsert({
      key: input.key,
      value_json: input.value as Json,
      description: input.description ?? "",
      updated_by: admin.userId,
      updated_at: new Date().toISOString(),
    });
    await audit({
      action: "setting_updated",
      description: `Setting ${input.key}`,
      newValue: { key: input.key, value: input.value },
    });
    revalidatePlatform();
    return { success: true, message: "Setting saved." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not save setting."),
    };
  }
}

export async function createLicenseAction(input: {
  organizationId: string;
  licenseType: string;
  seats?: number;
}): Promise<PlatformActionResult> {
  try {
    const admin = await requirePlatformAdmin();
    if (!hasPlatformPermission(admin.role, "licenses:manage")) {
      return { success: false, message: PLATFORM_UI.accessDenied };
    }
    const supabase = await platformServiceClient();
    const { data, error } = await supabase
      .from("platform_licenses")
      .insert({
        organization_id: input.organizationId,
        license_type: input.licenseType,
        seats: input.seats ?? 0,
        status: "active",
        starts_at: new Date().toISOString(),
        created_by: admin.userId,
      })
      .select("id")
      .single();
    if (error) throw error;
    await audit({
      action: "license_created",
      description: `License ${input.licenseType}`,
      affectedOrganizationId: input.organizationId,
    });
    revalidatePlatform();
    return { success: true, message: "License created.", id: data.id };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not create license."),
    };
  }
}

export async function enqueueBackupJobAction(input: {
  organizationId?: string;
  jobType: "backup" | "restore" | "export" | "import" | "disaster_recovery";
}): Promise<PlatformActionResult> {
  try {
    const admin = await requirePlatformAdmin();
    if (!hasPlatformPermission(admin.role, "backups:manage")) {
      return { success: false, message: PLATFORM_UI.accessDenied };
    }
    const supabase = await platformServiceClient();
    const { data, error } = await supabase
      .from("platform_backup_jobs")
      .insert({
        organization_id: input.organizationId ?? null,
        job_type: input.jobType,
        status: "queued",
        requested_by: admin.userId,
      })
      .select("id")
      .single();
    if (error) throw error;
    await audit({
      action: "backup_job_queued",
      description: `Queued ${input.jobType}`,
      affectedOrganizationId: input.organizationId,
    });
    revalidatePlatform();
    return {
      success: true,
      message: `${PLATFORM_UI.futureBackup} Job queued.`,
      id: data.id,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not queue backup job."),
    };
  }
}

export async function markPlatformNotificationReadAction(
  id: string,
): Promise<PlatformActionResult> {
  try {
    await requirePlatformAdmin();
    const supabase = await platformServiceClient();
    await supabase
      .from("platform_notifications")
      .update({ is_read: true })
      .eq("id", id);
    revalidatePlatform();
    return { success: true, message: "Marked read." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not update notification."),
    };
  }
}
