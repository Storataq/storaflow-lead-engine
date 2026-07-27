/**
 * Audience foundation — filter shape only (no query execution against CRM yet).
 */

export type AudienceFilter = {
  campaignReadyOnly?: boolean;
  approvalStatus?: string[];
  salesPriorities?: string[];
  requireEmail?: boolean;
  excludeSuppressed?: boolean;
  sourceTags?: string[];
  ownerUserIds?: string[];
};

export type AudienceDefinition = {
  name: string;
  description?: string | null;
  filter: AudienceFilter;
};

export function createDefaultCampaignReadyAudience(): AudienceDefinition {
  return {
    name: "Campaign Ready (approved)",
    description:
      "Leads with approved campaign readiness from Phase 20D. Not enrolled until a later phase.",
    filter: {
      campaignReadyOnly: true,
      approvalStatus: ["approved"],
      requireEmail: true,
      excludeSuppressed: true,
    },
  };
}

export function summarizeAudienceFilter(filter: AudienceFilter): string[] {
  const lines: string[] = [];
  if (filter.campaignReadyOnly) lines.push("Campaign ready only");
  if (filter.requireEmail) lines.push("Require preferred email");
  if (filter.excludeSuppressed !== false) lines.push("Exclude suppressed");
  if (filter.approvalStatus?.length) {
    lines.push(`Approval: ${filter.approvalStatus.join(", ")}`);
  }
  if (filter.salesPriorities?.length) {
    lines.push(`Priority: ${filter.salesPriorities.join(", ")}`);
  }
  return lines;
}
