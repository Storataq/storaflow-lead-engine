/**
 * Campaign Readiness Engine — prepares leads for future email campaigns (no send).
 */

import { selectPreferredContact } from "@/lib/crm/funnel-activation/contact-selection";
import {
  calculateSalesPriority,
  evaluatePersonalization,
} from "@/lib/crm/funnel-activation/priority";
import type {
  CampaignReadinessFactor,
  CampaignReadinessResult,
  ContactabilityClass,
  FunnelActivationPolicy,
} from "@/lib/crm/funnel-activation/types";
import type { SelectableContact } from "@/lib/crm/funnel-activation/contact-selection";

export function calculateCampaignReadiness(input: {
  policy: FunnelActivationPolicy;
  companyEligible: boolean;
  companyEligibilityReasons: string[];
  contactability: ContactabilityClass;
  suppressed: boolean;
  suppressionReason?: string | null;
  qualificationScore: number;
  opportunityScore: number;
  qualified: boolean;
  outreachReady: boolean;
  contacts: SelectableContact[];
  companyName?: string | null;
  industry?: string | null;
  city?: string | null;
  country?: string | null;
  website?: string | null;
  description?: string | null;
  contactName?: string | null;
  openDuplicateLead?: boolean;
}): CampaignReadinessResult {
  const factors: CampaignReadinessFactor[] = [];
  const missing: string[] = [];
  const reasons: string[] = [];

  const selection = selectPreferredContact({
    contacts: input.contacts,
    allowRoleEmails: input.policy.allowRoleEmails,
  });
  const preferred = selection.preferred;
  const firstName = input.contactName?.trim().split(/\s+/)[0] ?? null;

  const personalization = evaluatePersonalization({
    companyName: input.companyName,
    contactFirstName: firstName,
    industry: input.industry,
    location: [input.city, input.country].filter(Boolean).join(", ") || null,
    website: input.website,
    description: input.description,
  });

  const dataCompleteness = Math.round(
    ([
      input.companyName,
      preferred?.email,
      input.website,
      input.industry,
      input.city || input.country,
      firstName,
    ].filter((v) => Boolean(v?.toString().trim())).length /
      6) *
      100,
  );

  const priority = calculateSalesPriority({
    qualificationScore: input.qualificationScore,
    opportunityScore: input.opportunityScore,
    contactability: input.contactability,
    suppressed: input.suppressed,
    dataCompleteness,
  });

  const push = (
    key: string,
    label: string,
    passed: boolean,
    required: boolean,
    detail: string,
  ) => {
    factors.push({ key, label, passed, required, detail });
    if (!passed && required) missing.push(label);
  };

  push(
    "company",
    "Company eligible",
    input.companyEligible,
    true,
    input.companyEligibilityReasons.join("; ") || "Checked",
  );
  push(
    "qualification",
    "Qualification threshold",
    input.qualificationScore >= input.policy.qualificationThreshold,
    true,
    `Score ${input.qualificationScore} / threshold ${input.policy.qualificationThreshold}`,
  );
  push(
    "opportunity",
    "Opportunity threshold",
    input.opportunityScore >= input.policy.opportunityThreshold,
    false,
    `Score ${input.opportunityScore} / threshold ${input.policy.opportunityThreshold}`,
  );
  push(
    "email",
    "Usable email",
    Boolean(preferred?.email),
    true,
    preferred?.email
      ? `Preferred ${preferred.email}`
      : "No preferred email",
  );
  push(
    "named_contact",
    "Named contact",
    Boolean(firstName) || Boolean(preferred?.isNamed),
    input.policy.requireNamedContact,
    firstName || preferred?.name || "Not required / missing",
  );
  push(
    "suppression",
    "Not suppressed",
    !input.suppressed,
    true,
    input.suppressed
      ? input.suppressionReason || "Suppressed"
      : "No suppression match",
  );
  push(
    "duplicate",
    "Not a conflicting duplicate",
    !input.openDuplicateLead,
    false,
    input.openDuplicateLead ? "Open duplicate lead context" : "OK",
  );
  push(
    "personalization",
    "Personalization data",
    personalization.status !== "missing_personalization",
    false,
    personalization.status,
  );

  if (input.suppressed) {
    return {
      status: "suppressed",
      approvalStatus: "suppressed",
      salesPriority: "not_ready",
      personalizationStatus: personalization.status,
      preferredEmail: preferred?.email ?? null,
      preferredName: preferred?.name ?? firstName,
      preferredPhone: preferred?.phone ?? null,
      contactId: preferred?.id ?? null,
      contactability: "suppressed",
      qualificationScore: input.qualificationScore,
      opportunityScore: input.opportunityScore,
      priorityScore: 0,
      reasons: [
        "Suppression overrides qualification and opportunity scores",
        ...(input.suppressionReason ? [input.suppressionReason] : []),
      ],
      missingRequirements: missing,
      factors,
      personalizationFields: personalization.fields,
      suppressionReason: input.suppressionReason ?? "Suppressed",
      alternatives: selection.alternatives.map((a) => ({
        email: a.email,
        score: a.score,
        reason: a.reason,
      })),
    };
  }

  if (!input.companyEligible) {
    return {
      status: "not_eligible",
      approvalStatus: "pending_review",
      salesPriority: priority.priority,
      personalizationStatus: personalization.status,
      preferredEmail: preferred?.email ?? null,
      preferredName: preferred?.name ?? firstName,
      preferredPhone: preferred?.phone ?? null,
      contactId: preferred?.id ?? null,
      contactability: input.contactability,
      qualificationScore: input.qualificationScore,
      opportunityScore: input.opportunityScore,
      priorityScore: priority.score,
      reasons: input.companyEligibilityReasons,
      missingRequirements: missing,
      factors,
      personalizationFields: personalization.fields,
      suppressionReason: null,
      alternatives: selection.alternatives.map((a) => ({
        email: a.email,
        score: a.score,
        reason: a.reason,
      })),
    };
  }

  if (!preferred?.email) {
    return {
      status: "needs_contact",
      approvalStatus: "pending_review",
      salesPriority: priority.priority,
      personalizationStatus: personalization.status,
      preferredEmail: null,
      preferredName: firstName,
      preferredPhone: preferred?.phone ?? null,
      contactId: null,
      contactability: input.contactability,
      qualificationScore: input.qualificationScore,
      opportunityScore: input.opportunityScore,
      priorityScore: priority.score,
      reasons: ["No usable contact method for email campaign preparation"],
      missingRequirements: [...missing, "Preferred email"],
      factors,
      personalizationFields: personalization.fields,
      suppressionReason: null,
      alternatives: [],
    };
  }

  if (preferred.verification === "invalid") {
    return {
      status: "needs_verification",
      approvalStatus: "pending_review",
      salesPriority: priority.priority,
      personalizationStatus: personalization.status,
      preferredEmail: preferred.email,
      preferredName: preferred.name ?? firstName,
      preferredPhone: preferred.phone ?? null,
      contactId: preferred.id ?? null,
      contactability: input.contactability,
      qualificationScore: input.qualificationScore,
      opportunityScore: input.opportunityScore,
      priorityScore: priority.score,
      reasons: ["Preferred email marked invalid — cannot approve for email outreach"],
      missingRequirements: [...missing, "Valid email"],
      factors,
      personalizationFields: personalization.fields,
      suppressionReason: null,
      alternatives: selection.alternatives.map((a) => ({
        email: a.email,
        score: a.score,
        reason: a.reason,
      })),
    };
  }

  if (
    input.qualificationScore < input.policy.qualificationThreshold ||
    !input.qualified
  ) {
    return {
      status: "not_qualified",
      approvalStatus: "pending_review",
      salesPriority: priority.priority,
      personalizationStatus: personalization.status,
      preferredEmail: preferred.email,
      preferredName: preferred.name ?? firstName,
      preferredPhone: preferred.phone ?? null,
      contactId: preferred.id ?? null,
      contactability: input.contactability,
      qualificationScore: input.qualificationScore,
      opportunityScore: input.opportunityScore,
      priorityScore: priority.score,
      reasons: ["Qualification below organization threshold"],
      missingRequirements: missing,
      factors,
      personalizationFields: personalization.fields,
      suppressionReason: null,
      alternatives: selection.alternatives.map((a) => ({
        email: a.email,
        score: a.score,
        reason: a.reason,
      })),
    };
  }

  if (personalization.status === "missing_personalization") {
    reasons.push("Missing personalization fields");
    return {
      status: "needs_personalization",
      approvalStatus: "pending_review",
      salesPriority: priority.priority,
      personalizationStatus: personalization.status,
      preferredEmail: preferred.email,
      preferredName: preferred.name ?? firstName,
      preferredPhone: preferred.phone ?? null,
      contactId: preferred.id ?? null,
      contactability: input.contactability,
      qualificationScore: input.qualificationScore,
      opportunityScore: input.opportunityScore,
      priorityScore: priority.score,
      reasons,
      missingRequirements: missing,
      factors,
      personalizationFields: personalization.fields,
      suppressionReason: null,
      alternatives: selection.alternatives.map((a) => ({
        email: a.email,
        score: a.score,
        reason: a.reason,
      })),
    };
  }

  const needsReview =
    input.policy.requireManualApproval ||
    input.contactability === "needs_review" ||
    input.contactability === "general_contact_only" ||
    !input.outreachReady ||
    priority.priority === "nurture";

  if (needsReview) {
    reasons.push(
      ...selection.reasons,
      "Manual approval required before future campaign enrollment",
      FUNNEL_NOTE,
    );
    return {
      status: input.policy.requireManualApproval
        ? "needs_approval"
        : "ready_with_review",
      approvalStatus: "pending_review",
      salesPriority: priority.priority,
      personalizationStatus: personalization.status,
      preferredEmail: preferred.email,
      preferredName: preferred.name ?? firstName,
      preferredPhone: preferred.phone ?? null,
      contactId: preferred.id ?? null,
      contactability: input.contactability,
      qualificationScore: input.qualificationScore,
      opportunityScore: input.opportunityScore,
      priorityScore: priority.score,
      reasons,
      missingRequirements: missing,
      factors,
      personalizationFields: personalization.fields,
      suppressionReason: null,
      alternatives: selection.alternatives.map((a) => ({
        email: a.email,
        score: a.score,
        reason: a.reason,
      })),
    };
  }

  reasons.push(...selection.reasons, "Technically ready for campaign preparation");
  return {
    status: "ready",
    approvalStatus: input.policy.requireManualApproval
      ? "pending_review"
      : "automatically_approved",
    salesPriority: priority.priority,
    personalizationStatus: personalization.status,
    preferredEmail: preferred.email,
    preferredName: preferred.name ?? firstName,
    preferredPhone: preferred.phone ?? null,
    contactId: preferred.id ?? null,
    contactability: input.contactability,
    qualificationScore: input.qualificationScore,
    opportunityScore: input.opportunityScore,
    priorityScore: priority.score,
    reasons,
    missingRequirements: missing,
    factors,
    personalizationFields: personalization.fields,
    suppressionReason: null,
    alternatives: selection.alternatives.map((a) => ({
      email: a.email,
      score: a.score,
      reason: a.reason,
    })),
  };
}

const FUNNEL_NOTE =
  "Technical readiness is not consent for outreach.";
