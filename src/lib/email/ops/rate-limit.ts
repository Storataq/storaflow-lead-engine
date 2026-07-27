/**
 * Phase 21L — lightweight in-memory rate limiter for public preference/tracking endpoints.
 * Not distributed; suitable for single-instance / pilot. Fail closed when exceeded.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function checkRateLimit(input: {
  key: string;
  limit?: number;
  windowMs?: number;
}): { allowed: boolean; remaining: number; retryAfterSec: number } {
  const limit = input.limit ?? Number(process.env.EMAIL_PREFERENCE_RATE_LIMIT ?? 60);
  const windowMs = input.windowMs ?? 60_000;
  const now = Date.now();
  const existing = buckets.get(input.key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(input.key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: Math.max(0, limit - 1), retryAfterSec: 0 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  buckets.set(input.key, existing);
  return {
    allowed: true,
    remaining: Math.max(0, limit - existing.count),
    retryAfterSec: 0,
  };
}
