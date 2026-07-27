/**
 * Centralized plan limit engine — all feature validation goes through here.
 */

import type {
  BillingFeatureKey,
  BillingLimitKey,
} from "@/lib/billing/constants";

export type LimitDefinition = {
  limitKey: BillingLimitKey | string;
  limitValue: number;
  softLimit?: number | null;
  warningThresholdPct: number;
  enforcement: "soft" | "hard";
};

export type LimitCheckResult = {
  allowed: boolean;
  limitKey: string;
  current: number;
  limit: number;
  remaining: number;
  pctUsed: number;
  isWarning: boolean;
  isSoftExceeded: boolean;
  isHardBlocked: boolean;
  enforcement: "soft" | "hard";
  upgradeSuggested: boolean;
  message: string;
};

export type FeatureCheckResult = {
  enabled: boolean;
  featureKey: string;
  upgradeSuggested: boolean;
  message: string;
};

export function checkLimit(
  def: LimitDefinition,
  current: number,
  requestedDelta = 1,
): LimitCheckResult {
  const limit = Number(def.limitValue);
  const next = current + requestedDelta;
  const pctUsed =
    limit <= 0 ? 100 : Math.min(100, Math.round((current / limit) * 100));
  const warningAt = Math.floor((limit * def.warningThresholdPct) / 100);
  const isWarning = current >= warningAt && current < limit;
  const softCap = def.softLimit ?? limit;
  const isSoftExceeded = next > softCap;
  const isHardBlocked = def.enforcement === "hard" && next > limit;
  const allowed = !isHardBlocked;

  let message = "Within plan limits.";
  if (isHardBlocked) {
    message = `Hard limit reached for ${def.limitKey}. Upgrade to continue.`;
  } else if (isSoftExceeded && def.enforcement === "soft") {
    message = `Soft limit exceeded for ${def.limitKey}. Upgrade recommended.`;
  } else if (isWarning) {
    message = `Warning: ${def.limitKey} usage at ${pctUsed}%.`;
  }

  return {
    allowed,
    limitKey: String(def.limitKey),
    current,
    limit,
    remaining: Math.max(0, limit - current),
    pctUsed,
    isWarning,
    isSoftExceeded,
    isHardBlocked,
    enforcement: def.enforcement,
    upgradeSuggested: isWarning || isSoftExceeded || isHardBlocked,
    message,
  };
}

export function checkFeature(
  featureKey: BillingFeatureKey | string,
  enabled: boolean,
): FeatureCheckResult {
  return {
    enabled,
    featureKey: String(featureKey),
    upgradeSuggested: !enabled,
    message: enabled
      ? "Feature available on current plan."
      : `Feature “${featureKey}” requires a higher plan.`,
  };
}

export function assertLimitOrThrow(result: LimitCheckResult): void {
  if (!result.allowed) {
    const err = new Error(result.message);
    (err as Error & { code?: string }).code = "PLAN_LIMIT_EXCEEDED";
    throw err;
  }
}

/** Grace period helper — future enforcement windows. */
export function isWithinGracePeriod(
  periodEnd: string | null | undefined,
  graceDays: number,
  now = new Date(),
): boolean {
  if (!periodEnd || graceDays <= 0) return false;
  const end = new Date(periodEnd).getTime();
  const graceMs = graceDays * 24 * 60 * 60 * 1000;
  const t = now.getTime();
  return t > end && t <= end + graceMs;
}

export function trialRemainingDays(
  trialEndsAt: string | null | undefined,
  now = new Date(),
): number | null {
  if (!trialEndsAt) return null;
  const ms = new Date(trialEndsAt).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}
