/**
 * Shared display formatters for Storaflow Foundation.
 * Prefer these over ad-hoc Intl calls so CRM, jobs, and dashboards stay consistent.
 */

export const DISPLAY = {
  notAvailable: "Niet beschikbaar",
  notVerified: "Niet geverifieerd",
  neverSynced: "Nooit gesynchroniseerd",
  noActivity: "Geen activiteit",
  missing: "—",
  estimateSuffix: " (schatting)",
} as const;

export function formatMissing(
  value: string | number | null | undefined,
  fallback: string = DISPLAY.missing,
): string {
  if (value == null) return fallback;
  if (typeof value === "string" && value.trim() === "") return fallback;
  return String(value);
}

export function formatDateTime(
  value: string | Date | null | undefined,
  fallback: string = DISPLAY.notAvailable,
): string {
  if (value == null || value === "") return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatDate(
  value: string | Date | null | undefined,
  fallback: string = DISPLAY.notAvailable,
): string {
  if (value == null || value === "") return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
  }).format(date);
}

/** Relative Dutch label for recent timestamps (deterministic buckets). */
export function formatRelativeDate(
  value: string | Date | null | undefined,
  now: Date = new Date(),
  fallback: string = DISPLAY.noActivity,
): string {
  if (value == null || value === "") return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return "Zojuist";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min. geleden`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} uur geleden`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay} dag${diffDay === 1 ? "" : "en"} geleden`;
  return formatDate(date);
}

export function formatCurrency(
  value: number | null | undefined,
  currency = "EUR",
  options?: { estimate?: boolean; fallback?: string },
): string {
  if (value == null || Number.isNaN(value)) {
    return options?.fallback ?? DISPLAY.notAvailable;
  }
  const formatted = new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
  return options?.estimate ? `${formatted}${DISPLAY.estimateSuffix}` : formatted;
}

export function formatPercent(
  value: number | null | undefined,
  options?: { digits?: number; fallback?: string },
): string {
  if (value == null || Number.isNaN(value)) {
    return options?.fallback ?? DISPLAY.notAvailable;
  }
  const digits = options?.digits ?? 0;
  return `${value.toFixed(digits)}%`;
}

export function formatScore(
  value: number | null | undefined,
  fallback: string = DISPLAY.notAvailable,
): string {
  if (value == null || Number.isNaN(value)) return fallback;
  return String(Math.round(value));
}

export function formatPhone(
  value: string | null | undefined,
  fallback: string = DISPLAY.notAvailable,
): string {
  if (!value || !value.trim()) return fallback;
  return value.trim();
}

export function formatUrl(
  value: string | null | undefined,
  fallback: string = DISPLAY.notAvailable,
): string {
  if (!value || !value.trim()) return fallback;
  const trimmed = value.trim();
  try {
    const url = trimmed.includes("://")
      ? new URL(trimmed)
      : new URL(`https://${trimmed}`);
    return url.hostname.replace(/^www\./, "") + (url.pathname === "/" ? "" : url.pathname);
  } catch {
    return trimmed;
  }
}

export function formatStatusLabel(
  value: string | null | undefined,
  fallback: string = DISPLAY.notAvailable,
): string {
  if (!value || !value.trim()) return fallback;
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
