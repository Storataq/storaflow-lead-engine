/**
 * Shared email-engine utilities.
 */

export function slugifyEmailEntityName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function safeTruncate(value: string, max = 240): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}
