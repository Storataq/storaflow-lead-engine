/**
 * Platform admin authentication — never trusts org membership roles.
 */

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import type { PlatformRole } from "@/lib/platform-admin/constants";
import type {
  PlatformAdminContext,
  PlatformAdminRow,
} from "@/lib/platform-admin/types";

function parseAllowlist(): Set<string> {
  const raw = process.env.PLATFORM_ADMIN_EMAILS?.trim() ?? "";
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** Check DB row or bootstrap email allowlist (env). */
export async function resolvePlatformAdmin(
  userId: string,
  email: string | null | undefined,
): Promise<PlatformAdminContext | null> {
  const normalizedEmail = (email ?? "").trim().toLowerCase();

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("platform_admins")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (data) {
      return {
        userId,
        email: data.email || normalizedEmail,
        admin: data,
        role: data.platform_role as PlatformRole,
      };
    }
  } catch {
    // Tables may not exist yet
  }

  const allowlist = parseAllowlist();
  if (normalizedEmail && allowlist.has(normalizedEmail)) {
    const admin: PlatformAdminRow = {
      id: "env-allowlist",
      user_id: userId,
      email: normalizedEmail,
      display_name: "Platform admin",
      platform_role: "platform_admin",
      status: "active",
      permissions_json: {},
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return {
      userId,
      email: normalizedEmail,
      admin,
      role: "platform_admin",
    };
  }

  return null;
}

export async function requirePlatformAdmin(): Promise<PlatformAdminContext> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error("Not authenticated.");
  }
  const ctx = await resolvePlatformAdmin(user.id, user.email);
  if (!ctx) {
    throw new Error("Platform administrator access required.");
  }
  return ctx;
}

export async function isCurrentUserPlatformAdmin(): Promise<boolean> {
  try {
    await requirePlatformAdmin();
    return true;
  } catch {
    return false;
  }
}

/** Service-role client after platform admin gate (cross-tenant reads). */
export async function platformServiceClient() {
  await requirePlatformAdmin();
  return createServiceClient();
}
