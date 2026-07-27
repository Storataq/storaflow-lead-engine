/**
 * Collaboration permissions — respects org RBAC (owner/admin).
 */

import type { CollabPermission } from "@/lib/collaboration/constants";

export type OrgRole = "owner" | "admin" | string;

const MEMBER_DEFAULTS: Record<CollabPermission, boolean> = {
  view: true,
  comment: true,
  mention: true,
  upload: true,
  delete: false,
  moderate: false,
  manage_teams: false,
};

const ADMIN_DEFAULTS: Record<CollabPermission, boolean> = {
  view: true,
  comment: true,
  mention: true,
  upload: true,
  delete: true,
  moderate: true,
  manage_teams: true,
};

export function isOrgAdmin(role: OrgRole): boolean {
  return role === "owner" || role === "admin";
}

export function hasCollabPermission(
  role: OrgRole,
  permission: CollabPermission,
  teamPermissions?: Partial<Record<CollabPermission, boolean>> | null,
): boolean {
  if (isOrgAdmin(role)) {
    return teamPermissions?.[permission] ?? ADMIN_DEFAULTS[permission];
  }
  return teamPermissions?.[permission] ?? MEMBER_DEFAULTS[permission];
}

export function canMentionEveryone(role: OrgRole): boolean {
  return isOrgAdmin(role);
}
