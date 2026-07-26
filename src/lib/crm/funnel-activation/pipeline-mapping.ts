/**
 * Map readiness → existing CRM pipeline stages (no new pipeline inventing).
 * Automatic movement stops at Contact Ready / Outreach prep (`contact-gepland`).
 * Never auto-move to eerste-email / contacted / won / lost.
 */

import type { SalesPriority } from "@/lib/crm/funnel-activation/types";
import type { ContactabilityClass } from "@/lib/crm/funnel-activation/types";
import type { CampaignReadinessStatus } from "@/lib/crm/funnel-activation/types";

export type StageMapping = {
  stageSlug: "nieuw" | "gekwalificeerd" | "contact-gepland";
  reason: string;
};

export function selectPipelineStage(input: {
  campaignStatus: CampaignReadinessStatus;
  contactability: ContactabilityClass;
  qualificationScore: number;
  qualificationThreshold: number;
  salesPriority: SalesPriority;
}): StageMapping {
  if (
    input.campaignStatus === "suppressed" ||
    input.campaignStatus === "blocked" ||
    input.campaignStatus === "not_eligible"
  ) {
    return {
      stageSlug: "nieuw",
      reason: "Held at New — not eligible for outreach progression",
    };
  }

  if (
    input.campaignStatus === "needs_contact" ||
    input.contactability === "missing_contact_data"
  ) {
    return {
      stageSlug: "nieuw",
      reason: "Missing contact data — remain New for review",
    };
  }

  if (
    input.campaignStatus === "ready" ||
    input.campaignStatus === "ready_with_review" ||
    input.campaignStatus === "needs_approval"
  ) {
    return {
      stageSlug: "contact-gepland",
      reason:
        "Campaign preparation / outreach ready — stop before Contacted (no email sent)",
    };
  }

  if (
    input.qualificationScore >= input.qualificationThreshold ||
    input.salesPriority === "high" ||
    input.salesPriority === "critical"
  ) {
    return {
      stageSlug: "gekwalificeerd",
      reason: "Qualified — waiting for contact/campaign readiness",
    };
  }

  return {
    stageSlug: "nieuw",
    reason: "Default placement — New",
  };
}

export function resolveStageId(
  stages: Array<{ id: string; slug: string }>,
  slug: string,
): string | null {
  return stages.find((s) => s.slug === slug)?.id ?? stages[0]?.id ?? null;
}
