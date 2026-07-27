/**
 * Campaign validation engine + readiness score (Phase 21C).
 * Deterministic — no send.
 */

import type {
  ReadinessClassification,
} from "@/lib/email/campaign/constants";
import { CAMPAIGN_COMPLIANCE_NOTICE } from "@/lib/email/campaign/constants";
import type { AudienceStatistics } from "@/lib/email/campaign/audience-builder";

export type CampaignValidationSeverity = "info" | "warning" | "blocking";

export type CampaignValidationIssue = {
  code: string;
  severity: CampaignValidationSeverity;
  message: string;
  field?: string;
};

export type CampaignValidationSummary = {
  hasBlocking: boolean;
  blockingCount: number;
  warningCount: number;
  infoCount: number;
  eligibleRecipients: number;
  excludedRecipients: number;
  complianceNotice: string;
};

export type CampaignValidationResult = {
  ok: boolean;
  issues: CampaignValidationIssue[];
  summary: CampaignValidationSummary;
  readinessScore: number;
  classification: ReadinessClassification;
  recommendations: string[];
};

export type CampaignValidationRequest = {
  name: string;
  status: string;
  campaignType?: string | null;
  objective?: string | null;
  language: string;
  templateId?: string | null;
  templateStatus?: string | null;
  templateLanguage?: string | null;
  templateArchived?: boolean;
  senderProfileId?: string | null;
  senderStatus?: string | null;
  audienceStats?: AudienceStatistics | null;
  maxRecipients?: number;
  complianceAck?: boolean;
  unsubscribeRequired?: boolean;
  personalizationMissingCount?: number;
  brokenVariableCount?: number;
  sequenceId?: string | null;
  sequenceStatus?: string | null;
  sequenceReadinessScore?: number;
  sequenceBlockingCount?: number;
  sequenceLanguage?: string | null;
  locked?: boolean;
  approved?: boolean;
};

function classify(score: number, blocking: number, approved: boolean): ReadinessClassification {
  if (approved) return "approved";
  if (blocking > 0 || score < 40) return "not_ready";
  if (score < 70) return "needs_work";
  if (score < 90) return "ready_with_warnings";
  return "ready";
}

export function validateCampaign(
  request: CampaignValidationRequest,
): CampaignValidationResult {
  const issues: CampaignValidationIssue[] = [];
  const recommendations: string[] = [];

  if (!request.name.trim()) {
    issues.push({
      code: "name_required",
      severity: "blocking",
      message: "Campaign name is required",
      field: "name",
    });
  }

  if (!request.objective?.trim()) {
    issues.push({
      code: "objective_missing",
      severity: "warning",
      message: "Campaign objective is empty — define purpose for compliance review",
      field: "objective",
    });
  }

  if (!request.templateId && !request.sequenceId) {
    issues.push({
      code: "template_or_sequence_required",
      severity: "blocking",
      message: "Select a template or an active sequence",
      field: "template_id",
    });
  } else if (request.templateId) {
    if (
      request.templateStatus === "archived" ||
      request.templateStatus === "deprecated" ||
      request.templateArchived
    ) {
      issues.push({
        code: "template_inactive",
        severity: "blocking",
        message: "Selected template is archived or deprecated",
        field: "template_id",
      });
    }
    if (
      request.templateStatus &&
      request.templateStatus !== "active" &&
      request.templateStatus !== "draft"
    ) {
      issues.push({
        code: "template_status",
        severity: "warning",
        message: `Template status is ${request.templateStatus}`,
        field: "template_id",
      });
    }
    if (
      request.templateLanguage &&
      request.templateLanguage !== request.language
    ) {
      issues.push({
        code: "template_language_mismatch",
        severity: "warning",
        message: `Template language (${request.templateLanguage}) differs from campaign (${request.language})`,
        field: "language",
      });
    }
  }

  if (!request.senderProfileId) {
    issues.push({
      code: "sender_required",
      severity: "blocking",
      message: "Sender profile must be selected",
      field: "sender_profile_id",
    });
  } else if (
    request.senderStatus === "invalid" ||
    request.senderStatus === "disabled"
  ) {
    issues.push({
      code: "sender_invalid",
      severity: "blocking",
      message: `Sender profile status is ${request.senderStatus}`,
      field: "sender_profile_id",
    });
  } else if (request.senderStatus === "draft") {
    issues.push({
      code: "sender_unverified",
      severity: "warning",
      message:
        "Sender profile is draft — domain verification is not integrated yet",
      field: "sender_profile_id",
    });
    recommendations.push(
      "Complete sender identity before scheduling (future provider phase).",
    );
  }

  if (request.sequenceId) {
    if (request.sequenceStatus !== "active" && request.approved) {
      issues.push({
        code: "sequence_not_active",
        severity: "blocking",
        message: "Only active sequences may be used on approved campaigns",
        field: "sequence_id",
      });
    } else if (
      request.sequenceStatus &&
      request.sequenceStatus !== "active" &&
      request.sequenceStatus !== "draft"
    ) {
      issues.push({
        code: "sequence_status",
        severity: "warning",
        message: `Sequence status is ${request.sequenceStatus} — publish before approval`,
        field: "sequence_id",
      });
    }
    if ((request.sequenceBlockingCount ?? 0) > 0) {
      issues.push({
        code: "sequence_blocking",
        severity: "blocking",
        message: "Selected sequence has blocking validation issues",
        field: "sequence_id",
      });
    }
    if ((request.sequenceReadinessScore ?? 0) < 70) {
      issues.push({
        code: "sequence_readiness",
        severity: "blocking",
        message: `Sequence readiness score (${request.sequenceReadinessScore ?? 0}) is below 70`,
        field: "sequence_id",
      });
    }
    if (
      request.sequenceLanguage &&
      request.sequenceLanguage !== request.language
    ) {
      issues.push({
        code: "sequence_language_mismatch",
        severity: "warning",
        message: `Sequence language (${request.sequenceLanguage}) differs from campaign (${request.language})`,
        field: "language",
      });
    }
  }

  const stats = request.audienceStats;
  if (!stats || stats.totalMatching === 0) {
    issues.push({
      code: "audience_empty",
      severity: "blocking",
      message: "Audience has no matching records",
      field: "audience",
    });
  } else {
    if (stats.validRecipients === 0) {
      issues.push({
        code: "no_valid_recipients",
        severity: "blocking",
        message: "No valid eligible recipients after suppression and validation",
        field: "audience",
      });
    }
    if (stats.suppressed > 0) {
      issues.push({
        code: "suppressed_present",
        severity: "info",
        message: `${stats.suppressed} suppressed recipient(s) excluded`,
      });
    }
    if (stats.duplicate > 0) {
      issues.push({
        code: "duplicates_present",
        severity: "warning",
        message: `${stats.duplicate} duplicate recipient(s) excluded`,
      });
    }
    const max = request.maxRecipients ?? 5000;
    if (stats.validRecipients > max) {
      issues.push({
        code: "recipient_limit",
        severity: "blocking",
        message: `Valid recipients (${stats.validRecipients}) exceed max (${max})`,
        field: "max_recipients",
      });
    }
    const exclusionRate =
      stats.totalMatching > 0
        ? (stats.totalMatching - stats.validRecipients) / stats.totalMatching
        : 1;
    if (exclusionRate > 0.5) {
      issues.push({
        code: "high_exclusion_rate",
        severity: "warning",
        message: `High exclusion rate (${Math.round(exclusionRate * 100)}%)`,
      });
      recommendations.push("Review audience filters or data quality.");
    }
  }

  if ((request.personalizationMissingCount ?? 0) > 0) {
    issues.push({
      code: "personalization_missing",
      severity: "blocking",
      message: `${request.personalizationMissingCount} recipient(s) missing required personalization variables`,
    });
  }

  if ((request.brokenVariableCount ?? 0) > 0) {
    issues.push({
      code: "broken_variables",
      severity: "blocking",
      message: `${request.brokenVariableCount} broken template variable(s)`,
    });
  }

  if (request.unsubscribeRequired !== false) {
    issues.push({
      code: "unsubscribe_prepared",
      severity: "info",
      message:
        "Unsubscribe capability is prepared via {{unsubscribeLink}} — processing not live yet",
    });
  } else {
    issues.push({
      code: "unsubscribe_disabled",
      severity: "blocking",
      message: "Unsubscribe requirement is disabled — not allowed for approval",
    });
  }

  if (!request.complianceAck) {
    issues.push({
      code: "compliance_ack_required",
      severity: "blocking",
      message: "Legal responsibility acknowledgment is required before approval",
      field: "compliance_ack",
    });
  }

  issues.push({
    code: "compliance_notice",
    severity: "info",
    message: CAMPAIGN_COMPLIANCE_NOTICE,
  });

  // Score
  let score = 100;
  const blocking = issues.filter((i) => i.severity === "blocking");
  const warnings = issues.filter((i) => i.severity === "warning");
  const infos = issues.filter((i) => i.severity === "info");

  score -= blocking.length * 18;
  score -= warnings.length * 6;
  if (stats && stats.validRecipients > 0) score += 5;
  if (request.templateId && request.templateStatus === "active") score += 5;
  if (request.senderProfileId) score += 3;
  if (request.complianceAck) score += 5;
  score = Math.max(0, Math.min(100, score));

  const classification = classify(
    score,
    blocking.length,
    Boolean(request.approved),
  );

  if (blocking.length === 0 && score >= 70) {
    recommendations.push(
      "Campaign can move to Ready / Approval preparation (no send).",
    );
  }

  return {
    ok: blocking.length === 0,
    issues,
    summary: {
      hasBlocking: blocking.length > 0,
      blockingCount: blocking.length,
      warningCount: warnings.length,
      infoCount: infos.length,
      eligibleRecipients: stats?.validRecipients ?? 0,
      excludedRecipients: stats
        ? stats.totalMatching - stats.validRecipients
        : 0,
      complianceNotice: CAMPAIGN_COMPLIANCE_NOTICE,
    },
    readinessScore: score,
    classification,
    recommendations,
  };
}
