/**
 * Password policy validation + RBAC permission resolution.
 */

import type {
  OrgSecurityRole,
  SecurityPermissionAction,
  SecurityPermissionResource,
} from "@/lib/security/constants";

export type PasswordPolicy = {
  minLength: number;
  requireUpper: boolean;
  requireLower: boolean;
  requireNumber: boolean;
  requireSymbol: boolean;
};

export type PasswordValidation =
  | { ok: true }
  | { ok: false; message: string };

export function validatePasswordAgainstPolicy(
  password: string,
  policy: PasswordPolicy,
): PasswordValidation {
  if (password.length < policy.minLength) {
    return {
      ok: false,
      message: `Password must be at least ${policy.minLength} characters.`,
    };
  }
  if (policy.requireUpper && !/[A-Z]/.test(password)) {
    return { ok: false, message: "Password must include an uppercase letter." };
  }
  if (policy.requireLower && !/[a-z]/.test(password)) {
    return { ok: false, message: "Password must include a lowercase letter." };
  }
  if (policy.requireNumber && !/[0-9]/.test(password)) {
    return { ok: false, message: "Password must include a number." };
  }
  if (policy.requireSymbol && !/[^A-Za-z0-9]/.test(password)) {
    return { ok: false, message: "Password must include a symbol." };
  }
  return { ok: true };
}

export function isSecurityAdmin(role: OrgSecurityRole | string): boolean {
  return role === "owner" || role === "admin";
}

/** Built-in role → permission matrix (custom roles overlay later). */
const ROLE_MATRIX: Record<
  OrgSecurityRole,
  Partial<Record<SecurityPermissionResource, SecurityPermissionAction[]>>
> = {
  owner: {
    companies: ["view", "create", "update", "delete", "export", "manage"],
    contacts: ["view", "create", "update", "delete", "export", "manage"],
    deals: ["view", "create", "update", "delete", "export", "manage"],
    tasks: ["view", "create", "update", "delete", "export", "manage"],
    campaigns: ["view", "create", "update", "delete", "export", "manage"],
    analytics: ["view", "export", "manage"],
    reports: ["view", "create", "update", "delete", "export", "manage"],
    copilot: ["view", "manage"],
    marketplace: ["view", "manage"],
    api: ["view", "manage"],
    white_label: ["view", "manage"],
    billing: ["view", "manage"],
    settings: ["view", "manage"],
    users: ["view", "manage"],
    organization: ["view", "manage"],
    security: ["view", "manage"],
  },
  admin: {
    companies: ["view", "create", "update", "delete", "export"],
    contacts: ["view", "create", "update", "delete", "export"],
    deals: ["view", "create", "update", "delete", "export"],
    tasks: ["view", "create", "update", "delete", "export"],
    campaigns: ["view", "create", "update", "delete", "export"],
    analytics: ["view", "export"],
    reports: ["view", "create", "update", "export"],
    copilot: ["view"],
    marketplace: ["view", "manage"],
    api: ["view", "manage"],
    white_label: ["view", "manage"],
    billing: ["view", "manage"],
    settings: ["view", "manage"],
    users: ["view", "manage"],
    organization: ["view"],
    security: ["view", "manage"],
  },
  member: {
    companies: ["view", "create", "update"],
    contacts: ["view", "create", "update"],
    deals: ["view", "create", "update"],
    tasks: ["view", "create", "update"],
    campaigns: ["view"],
    analytics: ["view"],
    reports: ["view"],
    copilot: ["view"],
    marketplace: ["view"],
    api: ["view"],
    settings: ["view"],
    users: ["view"],
  },
  viewer: {
    companies: ["view"],
    contacts: ["view"],
    deals: ["view"],
    tasks: ["view"],
    campaigns: ["view"],
    analytics: ["view"],
    reports: ["view"],
  },
};

export function hasSecurityPermission(
  role: OrgSecurityRole | string,
  resource: SecurityPermissionResource,
  action: SecurityPermissionAction,
  customPermissions?: Partial<
    Record<SecurityPermissionResource, SecurityPermissionAction[]>
  > | null,
): boolean {
  if (customPermissions?.[resource]?.includes(action)) return true;
  const normalized = (
    ORG_FALLBACK.includes(role as OrgSecurityRole)
      ? role
      : "member"
  ) as OrgSecurityRole;
  return ROLE_MATRIX[normalized]?.[resource]?.includes(action) ?? false;
}

const ORG_FALLBACK: OrgSecurityRole[] = [
  "owner",
  "admin",
  "member",
  "viewer",
];

export function previewPermissions(
  role: OrgSecurityRole,
): Partial<Record<SecurityPermissionResource, SecurityPermissionAction[]>> {
  return ROLE_MATRIX[role] ?? {};
}

export function ipMatchesCidrList(
  ip: string | null | undefined,
  cidrs: string[],
): boolean {
  if (!cidrs.length) return true;
  if (!ip) return false;
  // Exact match / prefix readiness (full CIDR math future)
  return cidrs.some((c) => {
    const trimmed = c.trim();
    if (!trimmed) return false;
    if (trimmed.includes("/")) {
      const prefix = trimmed.split("/")[0];
      return ip === prefix || ip.startsWith(prefix.replace(/\.$/, ""));
    }
    return ip === trimmed;
  });
}
