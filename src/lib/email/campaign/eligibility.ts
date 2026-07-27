/**
 * Recipient eligibility + deduplication (Phase 21C).
 */

import { isValidEmailSyntax } from "@/lib/email/validators";
import {
  evaluateSuppression,
  normalizeSuppressionEmail,
} from "@/lib/email/suppression";
import { resolveEffectiveCommunicationStatus } from "@/lib/email/preferences/resolver";
import type { AudienceCandidate } from "@/lib/email/campaign/audience-builder";
import type { RecipientEligibilityStatus } from "@/lib/email/campaign/constants";
import type { EmailSuppressionStatus } from "@/lib/email/types";
import { isRoleAddress } from "@/lib/email/campaign/audience-builder";

export type EligibilityResult = {
  status: RecipientEligibilityStatus;
  reasons: string[];
  eligible: boolean;
  preferredEmail: string | null;
};

export function evaluateCampaignEligibility(input: {
  candidate: AudienceCandidate;
  suppressionStatus?: EmailSuppressionStatus;
  /** Optional live preference/suppression evaluation (Phase 21I). */
  preferenceDecision?: ReturnType<typeof resolveEffectiveCommunicationStatus> | null;
  campaignLanguage?: string | null;
  requiredVariables?: string[];
  isDuplicate?: boolean;
  categoryCode?: string | null;
}): EligibilityResult {
  const reasons: string[] = [];
  const email = input.candidate.preferredEmail?.trim() || null;

  if (!email) {
    return {
      status: "missing_email",
      reasons: ["Preferred email missing"],
      eligible: false,
      preferredEmail: null,
    };
  }

  if (!isValidEmailSyntax(email)) {
    return {
      status: "invalid_email",
      reasons: ["Email syntax is invalid"],
      eligible: false,
      preferredEmail: email,
    };
  }

  if (input.preferenceDecision && !input.preferenceDecision.eligible) {
    return {
      status: "suppressed",
      reasons: input.preferenceDecision.blockingReasons.length
        ? input.preferenceDecision.blockingReasons
        : ["Blocked by communication preference / suppression resolver"],
      eligible: false,
      preferredEmail: email,
    };
  }

  const suppression = evaluateSuppression({
    status: input.suppressionStatus ?? "active",
  });
  if (suppression.blocked) {
    return {
      status: "suppressed",
      reasons: [suppression.message],
      eligible: false,
      preferredEmail: email,
    };
  }

  if (input.isDuplicate) {
    return {
      status: "duplicate",
      reasons: ["Duplicate recipient within campaign (normalized email)"],
      eligible: false,
      preferredEmail: email,
    };
  }

  if (
    input.candidate.readinessStatus !== "ready" &&
    input.candidate.readinessStatus !== "ready_with_review"
  ) {
    reasons.push(`Readiness is ${input.candidate.readinessStatus}`);
  }

  if (
    input.candidate.approvalStatus !== "approved" &&
    input.candidate.approvalStatus !== "automatically_approved"
  ) {
    reasons.push(`Campaign Ready approval is ${input.candidate.approvalStatus}`);
  }

  if (
    input.campaignLanguage &&
    input.candidate.language &&
    input.candidate.language !== input.campaignLanguage
  ) {
    return {
      status: "wrong_language",
      reasons: [
        `Recipient language ${input.candidate.language} ≠ campaign ${input.campaignLanguage}`,
      ],
      eligible: false,
      preferredEmail: email,
    };
  }

  const required = input.requiredVariables ?? [];
  const missingRequired = required.filter((key) => {
    const value = input.candidate.personalization[key];
    return !value?.toString().trim();
  });
  if (missingRequired.length) {
    return {
      status: "missing_personalization",
      reasons: [
        `Missing required personalization: ${missingRequired.join(", ")}`,
      ],
      eligible: false,
      preferredEmail: email,
    };
  }

  if (
    input.candidate.readinessStatus === "not_qualified" ||
    input.candidate.readinessStatus === "not_eligible"
  ) {
    return {
      status: "not_qualified",
      reasons: [`Not qualified: ${input.candidate.readinessStatus}`],
      eligible: false,
      preferredEmail: email,
    };
  }

  if (reasons.length || input.candidate.readinessStatus === "ready_with_review") {
    if (isRoleAddress(email)) {
      reasons.push("Role-based email address");
    }
    return {
      status: reasons.length ? "eligible_with_warning" : "needs_review",
      reasons:
        reasons.length > 0
          ? reasons
          : ["Campaign Ready marked ready_with_review"],
      eligible: true,
      preferredEmail: email,
    };
  }

  if (isRoleAddress(email)) {
    return {
      status: "eligible_with_warning",
      reasons: ["Role-based email address"],
      eligible: true,
      preferredEmail: email,
    };
  }

  return {
    status: "eligible",
    reasons: ["Eligible for campaign snapshot"],
    eligible: true,
    preferredEmail: email,
  };
}

export type DedupedRecipient = {
  candidate: AudienceCandidate;
  kept: boolean;
  duplicateOfLeadId: string | null;
  score: number;
};

function recipientStrength(candidate: AudienceCandidate): number {
  let score = 0;
  if (candidate.preferredName?.trim()) score += 30;
  if (candidate.personalizationStatus === "personalized") score += 25;
  else if (candidate.personalizationStatus === "company_level") score += 15;
  score += Math.min(candidate.priorityScore, 100) / 5;
  if (candidate.approvalStatus === "approved") score += 20;
  if (candidate.preferredEmail && isValidEmailSyntax(candidate.preferredEmail)) {
    score += 10;
  }
  if (!isRoleAddress(candidate.preferredEmail)) score += 10;
  return score;
}

/**
 * Deduplicate by normalized email (primary), then contact/lead.
 * Keeps the strongest eligible candidate; marks others as duplicates.
 */
export function dedupeAudienceCandidates(
  candidates: AudienceCandidate[],
): DedupedRecipient[] {
  const byEmail = new Map<string, AudienceCandidate[]>();
  const noEmail: AudienceCandidate[] = [];

  for (const candidate of candidates) {
    const email = candidate.preferredEmail?.trim();
    if (!email) {
      noEmail.push(candidate);
      continue;
    }
    const key = normalizeSuppressionEmail(email);
    const list = byEmail.get(key) ?? [];
    list.push(candidate);
    byEmail.set(key, list);
  }

  const out: DedupedRecipient[] = [];

  for (const group of byEmail.values()) {
    const ranked = [...group].sort(
      (a, b) => recipientStrength(b) - recipientStrength(a),
    );
    const winner = ranked[0]!;
    out.push({
      candidate: winner,
      kept: true,
      duplicateOfLeadId: null,
      score: recipientStrength(winner),
    });
    for (const loser of ranked.slice(1)) {
      out.push({
        candidate: loser,
        kept: false,
        duplicateOfLeadId: winner.leadId,
        score: recipientStrength(loser),
      });
    }
  }

  for (const candidate of noEmail) {
    out.push({
      candidate,
      kept: true,
      duplicateOfLeadId: null,
      score: recipientStrength(candidate),
    });
  }

  return out;
}

export function collectDuplicateEmailSet(
  candidates: AudienceCandidate[],
): Set<string> {
  const counts = new Map<string, number>();
  for (const candidate of candidates) {
    const email = candidate.preferredEmail?.trim();
    if (!email) continue;
    const key = normalizeSuppressionEmail(email);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const dupes = new Set<string>();
  for (const [key, count] of counts) {
    if (count > 1) dupes.add(key);
  }
  return dupes;
}
