/**
 * Effective communication status resolver — Phase 21I.
 * Mandatory suppressions always override positive preferences.
 */

import {
  COMMUNICATION_FREQUENCIES,
  ESSENTIAL_PURPOSES,
  FREQUENCY_DEFAULTS,
  MANDATORY_SUPPRESSION_REASONS,
  SUPPRESSION_PRECEDENCE,
  type CommunicationFrequency,
  type CommunicationPurpose,
  type CommunicationStatus,
  type EligibilityDecision,
  type SuppressionEvaluationResult,
} from "@/lib/email/preferences/constants";

export type SuppressionInput = {
  id?: string;
  status: string;
  reason: string;
  scope?: string | null;
  active?: boolean;
  permanentFlag?: boolean;
  expiresAt?: string | null;
  categoryCode?: string | null;
  campaignId?: string | null;
  sequenceId?: string | null;
  precedenceRank?: number | null;
};

export type PreferenceInput = {
  effectiveStatus?: string | null;
  frequencyType?: string | null;
  categoryPreferences?: Record<string, boolean> | null;
  pauseStartsAt?: string | null;
  pauseEndsAt?: string | null;
  doNotContact?: boolean | null;
  globalUnsubscribedAt?: string | null;
  minDaysBetweenEmails?: number | null;
  maxEmailsPerWeek?: number | null;
  maxEmailsPerMonth?: number | null;
  lastSentAt?: string | null;
  sentThisWeek?: number | null;
  sentThisMonth?: number | null;
};

function isExpired(expiresAt: string | null | undefined, now: Date): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= now.getTime();
}

function precedenceForReason(reason: string): number {
  return SUPPRESSION_PRECEDENCE[reason] ?? SUPPRESSION_PRECEDENCE.other;
}

function statusFromReason(reason: string): CommunicationStatus {
  if (reason === "legal_restriction") return "legal_hold";
  if (reason === "complaint") return "complaint_blocked";
  if (reason === "bounce_hard") return "hard_bounce_blocked";
  if (reason === "invalid_email") return "invalid";
  if (reason === "unsubscribed") return "unsubscribed";
  if (reason === "do_not_contact" || reason === "manual" || reason === "user_blocked") {
    return "suppressed";
  }
  return "suppressed";
}

export function resolveEffectiveCommunicationStatus(input: {
  suppressions: SuppressionInput[];
  preference?: PreferenceInput | null;
  categoryCode?: string | null;
  campaignId?: string | null;
  sequenceId?: string | null;
  purpose?: CommunicationPurpose | null;
  nowIso?: string;
}): EligibilityDecision {
  const now = new Date(input.nowIso ?? new Date().toISOString());
  const blockingReasons: string[] = [];
  const warningReasons: string[] = [];
  const appliedRules: string[] = [];
  let strongest: SuppressionInput | null = null;
  let strongestRank = Number.POSITIVE_INFINITY;

  const purpose = input.purpose ?? "sales_outreach";
  const isEssential = ESSENTIAL_PURPOSES.has(purpose);

  for (const row of input.suppressions) {
    if (row.active === false) continue;
    if (isExpired(row.expiresAt, now)) continue;

    const rank = row.precedenceRank ?? precedenceForReason(row.reason);
    if (rank < strongestRank) {
      strongestRank = rank;
      strongest = row;
    }

    const scope = row.scope ?? "organization";
    if (scope === "organization" || scope === "legal") {
      blockingReasons.push(`org_suppression:${row.reason}`);
      appliedRules.push(`suppression:${row.reason}:${scope}`);
    } else if (scope === "category" && row.categoryCode && row.categoryCode === input.categoryCode) {
      blockingReasons.push(`category_suppression:${row.categoryCode}`);
      appliedRules.push(`suppression:category:${row.categoryCode}`);
    } else if (scope === "campaign" && row.campaignId && row.campaignId === input.campaignId) {
      blockingReasons.push(`campaign_suppression:${row.campaignId}`);
      appliedRules.push(`suppression:campaign`);
    } else if (scope === "sequence" && row.sequenceId && row.sequenceId === input.sequenceId) {
      blockingReasons.push(`sequence_suppression:${row.sequenceId}`);
      appliedRules.push(`suppression:sequence`);
    }
  }

  const pref = input.preference ?? null;
  if (pref?.doNotContact) {
    blockingReasons.push("do_not_contact");
    appliedRules.push("preference:do_not_contact");
  }
  if (pref?.globalUnsubscribedAt) {
    blockingReasons.push("global_unsubscribe");
    appliedRules.push("preference:global_unsubscribe");
  }

  let pauseActive = false;
  if (pref?.pauseEndsAt) {
    const ends = new Date(pref.pauseEndsAt).getTime();
    const starts = pref.pauseStartsAt ? new Date(pref.pauseStartsAt).getTime() : 0;
    if (now.getTime() >= starts && now.getTime() < ends) {
      pauseActive = true;
      if (!isEssential) {
        blockingReasons.push("temporary_pause");
        appliedRules.push("preference:temporary_pause");
      } else {
        warningReasons.push("pause_active_but_essential_purpose");
      }
    }
  }

  let categoryBlocked = false;
  if (input.categoryCode && pref?.categoryPreferences) {
    const subscribed = pref.categoryPreferences[input.categoryCode];
    if (subscribed === false) {
      categoryBlocked = true;
      if (!isEssential) {
        blockingReasons.push(`category_unsubscribed:${input.categoryCode}`);
        appliedRules.push("preference:category_unsubscribe");
      }
    }
  }

  let frequencyBlocked = false;
  let nextEligibleAt: string | null = null;
  const frequencyType = (pref?.frequencyType ??
    "immediate") as CommunicationFrequency;
  if (
    !isEssential &&
    COMMUNICATION_FREQUENCIES.includes(frequencyType) &&
    frequencyType !== "immediate"
  ) {
    const defaults = FREQUENCY_DEFAULTS[frequencyType];
    const minDays = pref?.minDaysBetweenEmails ?? defaults.minDays;
    const maxWeek = pref?.maxEmailsPerWeek ?? defaults.maxPerWeek;
    const maxMonth = pref?.maxEmailsPerMonth ?? defaults.maxPerMonth;

    if (frequencyType === "no_promotional") {
      frequencyBlocked = true;
      blockingReasons.push("frequency:no_promotional");
      appliedRules.push("preference:frequency");
    }
    if (typeof maxWeek === "number" && maxWeek === 0) {
      frequencyBlocked = true;
      blockingReasons.push("frequency:max_per_week_zero");
    }
    if (
      typeof minDays === "number" &&
      minDays > 0 &&
      pref?.lastSentAt
    ) {
      const next = new Date(pref.lastSentAt);
      next.setUTCDate(next.getUTCDate() + minDays);
      if (next.getTime() > now.getTime()) {
        frequencyBlocked = true;
        nextEligibleAt = next.toISOString();
        blockingReasons.push("frequency:min_days_between");
        appliedRules.push("preference:frequency_spacing");
      }
    }
    if (typeof maxWeek === "number" && maxWeek > 0 && (pref?.sentThisWeek ?? 0) >= maxWeek) {
      frequencyBlocked = true;
      blockingReasons.push("frequency:max_per_week");
    }
    if (
      typeof maxMonth === "number" &&
      maxMonth > 0 &&
      (pref?.sentThisMonth ?? 0) >= maxMonth
    ) {
      frequencyBlocked = true;
      blockingReasons.push("frequency:max_per_month");
    }
  }

  const mandatoryHit =
    strongest &&
    MANDATORY_SUPPRESSION_REASONS.has(strongest.reason);

  let effectiveStatus: CommunicationStatus = "subscribed";
  if (mandatoryHit && strongest) {
    effectiveStatus = statusFromReason(strongest.reason);
  } else if (blockingReasons.some((r) => r.startsWith("org_suppression") || r === "global_unsubscribe" || r === "do_not_contact")) {
    effectiveStatus = strongest ? statusFromReason(strongest.reason) : "unsubscribed";
  } else if (pauseActive && !isEssential) {
    effectiveStatus = "paused";
  } else if (categoryBlocked && !isEssential) {
    effectiveStatus = "partially_subscribed";
  } else if (frequencyBlocked && !isEssential) {
    effectiveStatus = "partially_subscribed";
    warningReasons.push("frequency_limits_active");
  } else if (pref?.effectiveStatus === "unknown") {
    effectiveStatus = "unknown";
  }

  // Essential purpose may still send unless mandatory/legal/complaint/hard-bounce.
  const eligible =
    isEssential
      ? !(
          mandatoryHit ||
          blockingReasons.includes("do_not_contact") ||
          strongest?.reason === "invalid_email"
        )
      : blockingReasons.length === 0;

  if (!eligible && isEssential) {
    appliedRules.push("essential_purpose_still_blocked_by_mandatory");
  }

  const result: SuppressionEvaluationResult = {
    blocked: !eligible,
    effectiveStatus,
    eligible,
    blockingReasons,
    warningReasons,
    nextEligibleAt,
    strongestSuppressionReason: strongest?.reason ?? null,
    strongestPrecedence: Number.isFinite(strongestRank) ? strongestRank : null,
    appliedRules,
    evaluatedAt: now.toISOString(),
  };

  return {
    ...result,
    categoryBlocked,
    pauseActive,
    frequencyBlocked,
  };
}

export function canResubscribe(input: {
  suppressions: SuppressionInput[];
  preference?: PreferenceInput | null;
}): { allowed: boolean; requiresConfirmation: boolean; blockedReasons: string[] } {
  const blockedReasons: string[] = [];
  for (const row of input.suppressions) {
    if (row.active === false) continue;
    if (MANDATORY_SUPPRESSION_REASONS.has(row.reason)) {
      blockedReasons.push(row.reason);
    }
  }
  if (input.preference?.doNotContact) {
    blockedReasons.push("do_not_contact");
  }
  if (blockedReasons.length > 0) {
    return { allowed: false, requiresConfirmation: false, blockedReasons };
  }
  return {
    allowed: true,
    requiresConfirmation: Boolean(input.preference?.globalUnsubscribedAt),
    blockedReasons: [],
  };
}
