/**
 * Phase 26G — Platform admin public surface (client-safe).
 */

export {
  PLATFORM_ROLES,
  PLATFORM_ROLE_LABELS,
  PLATFORM_PERMISSIONS,
  ORG_LIFECYCLE_LABELS,
  LICENSE_TYPE_LABELS,
  ANNOUNCEMENT_TYPE_LABELS,
  IMPERSONATION_MODE_LABELS,
  PLATFORM_UI,
} from "@/lib/platform-admin/constants";

export {
  hasPlatformPermission,
  listPlatformPermissions,
} from "@/lib/platform-admin/permissions";
