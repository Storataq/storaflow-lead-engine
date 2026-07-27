/**
 * Phase 21L — shared security helpers (timing-safe compare, URL safety, CSV escape).
 */

import { createHash, timingSafeEqual } from "crypto";

export function timingSafeStringEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function createCorrelationId(prefix = "email"): string {
  return `${prefix}_${Date.now().toString(36)}_${createHash("sha256")
    .update(`${Math.random()}${Date.now()}`)
    .digest("hex")
    .slice(0, 12)}`;
}

const UNSAFE_URL_SCHEMES = /^(javascript|data|vbscript|file|about):/i;

export function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (UNSAFE_URL_SCHEMES.test(parsed.protocol)) return false;
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function escapeCsvCell(value: string): string {
  const trimmed = value.trimStart();
  if (/^[=+\-@]/.test(trimmed)) {
    return `'${value}`;
  }
  return value;
}

export function redactSecret(value: string | null | undefined): string {
  if (!value) return "(unset)";
  if (value.length <= 4) return "****";
  return `${value.slice(0, 2)}…${value.slice(-2)} (len=${value.length})`;
}

export function envFlag(name: string, defaultValue = false): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (raw == null || raw === "") return defaultValue;
  return raw === "true" || raw === "1" || raw === "yes";
}

export function parseAllowlist(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[\s,;]+/)
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}
