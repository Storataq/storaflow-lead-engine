/**
 * Campaign engine — status helpers + Phase 21C manager re-exports.
 * Execution remains disabled.
 */

import type { EmailCampaignStatus } from "@/lib/email/types";
import { EMAIL_CAMPAIGN_STATUSES as MANAGER_STATUSES } from "@/lib/email/campaign/constants";

export const EMAIL_CAMPAIGN_STATUSES = MANAGER_STATUSES;

export {
  EMAIL_CAMPAIGN_TYPES,
  EMAIL_CAMPAIGN_TYPE_LABELS,
  EMAIL_CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_MANAGER_EDITABLE_STATUSES,
  CAMPAIGN_COMPLIANCE_NOTICE,
  DEFAULT_CAMPAIGN_SETTINGS,
} from "@/lib/email/campaign/constants";

export {
  validateCampaign,
  type CampaignValidationResult,
  type CampaignValidationIssue,
} from "@/lib/email/campaign/validation";

export {
  matchesAudienceDefinition,
  summarizeAudienceCandidates,
  type CampaignAudienceDefinition,
  type AudiencePreview,
} from "@/lib/email/campaign/audience-builder";

export {
  evaluateCampaignEligibility,
  dedupeAudienceCandidates,
} from "@/lib/email/campaign/eligibility";

export function canStartCampaign(status: EmailCampaignStatus): boolean {
  // Execution disabled — helper kept for future phases
  return status === "draft" || status === "scheduled" || status === "paused";
}

export function canPauseCampaign(status: EmailCampaignStatus): boolean {
  return status === "running" || status === "scheduled";
}

export function isCampaignTerminal(status: EmailCampaignStatus): boolean {
  return (
    status === "completed" ||
    status === "cancelled" ||
    status === "archived"
  );
}

/** Manager-phase transitions that do not send. */
export function canEditCampaign(status: EmailCampaignStatus): boolean {
  return (
    status === "draft" ||
    status === "needs_review" ||
    status === "ready"
  );
}

export function canApproveCampaignStatus(status: EmailCampaignStatus): boolean {
  return status === "ready" || status === "needs_review";
}

/**
 * Execution intentionally disabled.
 */
export function assertCampaignExecutionDisabled(): never {
  throw new Error(
    "Campaign execution is disabled. Phase 21C prepares and approves campaigns only — no sending.",
  );
}
