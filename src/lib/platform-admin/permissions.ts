/**
 * Platform RBAC — completely separate from organization security roles.
 * Platform admins never inherit customer org permissions via this matrix.
 */

import type {
  PlatformPermission,
  PlatformRole,
} from "@/lib/platform-admin/constants";

const ROLE_PERMISSIONS: Record<PlatformRole, readonly PlatformPermission[]> = {
  platform_owner: [
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
  ],
  platform_admin: [
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
  ],
  platform_support: [
    "dashboard:view",
    "organizations:view",
    "users:view",
    "subscriptions:view",
    "licenses:view",
    "support:view",
    "monitoring:view",
    "audit:view",
    "impersonate:read_only",
  ],
  platform_readonly: [
    "dashboard:view",
    "organizations:view",
    "users:view",
    "subscriptions:view",
    "licenses:view",
    "support:view",
    "monitoring:view",
    "audit:view",
  ],
};

export function hasPlatformPermission(
  role: PlatformRole | string,
  permission: PlatformPermission,
): boolean {
  const perms = ROLE_PERMISSIONS[role as PlatformRole];
  if (!perms) return false;
  return perms.includes(permission);
}

export function listPlatformPermissions(
  role: PlatformRole | string,
): PlatformPermission[] {
  return [...(ROLE_PERMISSIONS[role as PlatformRole] ?? [])];
}
