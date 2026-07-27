/**
 * Recipient engine foundation — enrollment gate helpers (no send).
 */

import type { CampaignRecipientPreview } from "@/lib/crm/funnel-activation/types";
import { evaluateSuppression } from "@/lib/email/suppression";
import type {
  EmailRecipient,
  EmailSuppressionStatus,
  EmailValidationStatus,
} from "@/lib/email/types";

export type RecipientEnrollmentDecision = {
  eligible: boolean;
  reasons: string[];
  preferredEmail: string | null;
};

/**
 * Gate enrollment using Phase 20D campaign-ready preview + suppression.
 * Does not enroll or send.
 */
export function evaluateRecipientEnrollment(input: {
  preview: CampaignRecipientPreview;
  suppressionStatus?: EmailSuppressionStatus;
}): RecipientEnrollmentDecision {
  const reasons: string[] = [];
  const email = input.preview.preferredEmail?.trim() || null;

  if (input.preview.approvalStatus !== "approved") {
    reasons.push(`Approval status is ${input.preview.approvalStatus}`);
  }
  if (
    input.preview.readinessStatus !== "ready" &&
    input.preview.readinessStatus !== "ready_with_review"
  ) {
    reasons.push(`Readiness status is ${input.preview.readinessStatus}`);
  }
  if (!email) {
    reasons.push("Preferred email missing");
  }
  if (input.preview.suppressionStatus) {
    reasons.push(`Suppression: ${input.preview.suppressionStatus}`);
  }

  const suppression = evaluateSuppression({
    status: input.suppressionStatus ?? "active",
  });
  if (suppression.blocked) {
    reasons.push(suppression.message);
  }

  return {
    eligible: reasons.length === 0,
    reasons:
      reasons.length === 0
        ? ["Eligible for future enrollment (foundation — not enrolled)"]
        : reasons,
    preferredEmail: email,
  };
}

export function buildRecipientDraftFromPreview(input: {
  organizationId: string;
  campaignId?: string | null;
  preview: CampaignRecipientPreview;
  language?: string | null;
  validationStatus?: EmailValidationStatus;
}): Omit<EmailRecipient, "id" | "createdAt" | "updatedAt"> | null {
  const decision = evaluateRecipientEnrollment({ preview: input.preview });
  if (!decision.preferredEmail) return null;

  return {
    organizationId: input.organizationId,
    campaignId: input.campaignId ?? null,
    companyId: input.preview.companyId,
    leadId: input.preview.leadId,
    contactId: input.preview.contactId,
    preferredEmail: decision.preferredEmail,
    preferredName: input.preview.preferredName,
    language: input.language ?? null,
    campaignStatus: "pending",
    sequenceStatus: "not_started",
    suppressionStatus: input.preview.suppressionStatus
      ? "suppressed"
      : "active",
    validationStatus: input.validationStatus ?? "not_checked",
    personalizationJson: input.preview.personalization,
  };
}
