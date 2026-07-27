/**
 * Security engine — injection / abuse / PII heuristics (tenant-safe gates).
 */

import type { SecurityScanResult } from "@/ai/types";

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /disregard\s+(your\s+)?system\s+prompt/i,
  /you\s+are\s+now\s+(dan|jailbroken|unrestricted)/i,
  /exfiltrate\s+(api\s+)?keys?/i,
  /bypass\s+(all\s+)?(safety|security|permissions?)/i,
  /<\/?\s*system\s*>/i,
];

const PII_PATTERNS: RegExp[] = [
  /\b\d{3}-\d{2}-\d{4}\b/, // US SSN-like
  /\b(?:\d[ -]*?){13,19}\b/, // long card-like digit runs
];

const CROSS_TENANT_HINTS: RegExp[] = [
  /organization_id\s*=\s*['"]?[0-9a-f-]{36}/i,
  /drop\s+table\s+/i,
  /service_role/i,
];

export function scanUserInput(
  raw: string,
  options?: { strict?: boolean },
): SecurityScanResult {
  const flags: string[] = [];
  let sanitized = raw.trim();

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      flags.push("prompt_injection_signal");
      break;
    }
  }

  for (const pattern of CROSS_TENANT_HINTS) {
    if (pattern.test(sanitized)) {
      flags.push("privilege_escalation_signal");
      break;
    }
  }

  let piiHits = 0;
  for (const pattern of PII_PATTERNS) {
    if (pattern.test(sanitized)) {
      piiHits += 1;
      sanitized = sanitized.replace(pattern, "[REDACTED]");
    }
  }
  if (piiHits > 0) flags.push("pii_detected");

  if (sanitized.length > 50_000) {
    flags.push("input_too_large");
    sanitized = sanitized.slice(0, 50_000);
  }

  const strict = options?.strict ?? true;
  const blocked =
    flags.includes("prompt_injection_signal") ||
    flags.includes("privilege_escalation_signal") ||
    (strict && flags.includes("input_too_large"));

  return {
    allowed: !blocked,
    flags,
    sanitizedInput: sanitized,
  };
}

export function assertToolPermission(
  granted: string[],
  required: string[],
): { ok: boolean; missing: string[] } {
  const set = new Set(granted);
  const missing = required.filter((r) => !set.has(r));
  return { ok: missing.length === 0, missing };
}

export function rateLimitKey(
  organizationId: string,
  userId: string | null,
): string {
  return `ai:${organizationId}:${userId ?? "system"}`;
}

/** In-memory sliding window (process-local). Workers should layer Redis later. */
const windows = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  limitPerMinute: number,
  nowMs = Date.now(),
): { allowed: boolean; remaining: number } {
  const cutoff = nowMs - 60_000;
  const prev = windows.get(key)?.filter((t) => t >= cutoff) ?? [];
  if (prev.length >= limitPerMinute) {
    windows.set(key, prev);
    return { allowed: false, remaining: 0 };
  }
  prev.push(nowMs);
  windows.set(key, prev);
  return { allowed: true, remaining: Math.max(0, limitPerMinute - prev.length) };
}
