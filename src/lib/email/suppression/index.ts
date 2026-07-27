/**
 * Suppression helpers — foundation only.
 * Future send paths MUST call isEmailSuppressed before queueing.
 */

import type {
  EmailSuppressionReason,
  EmailSuppressionStatus,
} from "@/lib/email/types";

export function normalizeSuppressionEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isTerminalSuppressionStatus(
  status: EmailSuppressionStatus,
): boolean {
  return status !== "active";
}

export function suppressionBlocksSending(
  status: EmailSuppressionStatus,
): boolean {
  return isTerminalSuppressionStatus(status);
}

export type SuppressionDecision = {
  blocked: boolean;
  status: EmailSuppressionStatus;
  reason: EmailSuppressionReason | null;
  message: string;
};

export function evaluateSuppression(input: {
  status: EmailSuppressionStatus;
  reason?: EmailSuppressionReason | null;
}): SuppressionDecision {
  if (suppressionBlocksSending(input.status)) {
    return {
      blocked: true,
      status: input.status,
      reason: input.reason ?? "other",
      message: `Recipient suppressed (${input.status}) — must not enqueue or send`,
    };
  }
  return {
    blocked: false,
    status: "active",
    reason: null,
    message: "Recipient allowed by suppression layer",
  };
}

/** Maps legacy exclusion_list types into email suppression reasons. */
export function mapExclusionTypeToReason(
  exclusionType: string,
): EmailSuppressionReason {
  switch (exclusionType) {
    case "email":
      return "do_not_contact";
    case "domain":
      return "internal_exclusion";
    case "company":
      return "internal_exclusion";
    default:
      return "other";
  }
}
