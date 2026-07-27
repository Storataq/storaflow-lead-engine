import {
  ADMIN_SCOPES,
  READ_ONLY_SCOPES,
  READ_WRITE_SCOPES,
  type ApiPermissionTier,
  type ApiScope,
} from "@/lib/platform-api/constants";

export function scopesForTier(
  tier: ApiPermissionTier,
  customScopes?: string[],
): ApiScope[] {
  switch (tier) {
    case "read_only":
      return [...READ_ONLY_SCOPES];
    case "read_write":
      return [...READ_WRITE_SCOPES];
    case "admin":
      return [...ADMIN_SCOPES];
    case "custom":
      return (customScopes ?? []).filter(Boolean) as ApiScope[];
    default:
      return [...READ_ONLY_SCOPES];
  }
}

export function hasScope(
  granted: string[] | null | undefined,
  required: ApiScope | ApiScope[],
): boolean {
  const list = granted ?? [];
  if (list.includes("*")) return true;
  const needed = Array.isArray(required) ? required : [required];
  return needed.every((scope) => {
    if (list.includes(scope)) return true;
    // write implies read for same resource
    if (scope.endsWith(":read")) {
      const write = scope.replace(/:read$/, ":write");
      return list.includes(write);
    }
    return false;
  });
}

export function parseScopesJson(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(String);
}
