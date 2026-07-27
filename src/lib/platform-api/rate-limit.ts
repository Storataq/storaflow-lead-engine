/**
 * Rate limiting helpers — daily counters + in-memory minute window.
 */

const minuteBuckets = new Map<string, { count: number; resetAt: number }>();

export function checkMinuteRateLimit(input: {
  keyId: string;
  limit: number;
  now?: number;
}): { allowed: boolean; remaining: number; resetAt: number } {
  const now = input.now ?? Date.now();
  const existing = minuteBuckets.get(input.keyId);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + 60_000;
    minuteBuckets.set(input.keyId, { count: 1, resetAt });
    return { allowed: true, remaining: Math.max(0, input.limit - 1), resetAt };
  }
  if (existing.count >= input.limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }
  existing.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, input.limit - existing.count),
    resetAt: existing.resetAt,
  };
}

/** Test helper */
export function __resetMinuteBucketsForTests() {
  minuteBuckets.clear();
}

export function utcUsageDate(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}
