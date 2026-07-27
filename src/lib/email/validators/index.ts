/**
 * Lightweight validators for email engine foundation inputs.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmailSyntax(email: string): boolean {
  const value = email.trim();
  if (!value || value.length > 254) return false;
  return EMAIL_RE.test(value);
}

export function assertNonEmptyName(name: string, label = "Name"): string {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error(`${label} is required`);
  }
  return trimmed;
}

export function sanitizeMergeVariableKey(key: string): string | null {
  const cleaned = key.trim();
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(cleaned)) return null;
  return cleaned;
}
