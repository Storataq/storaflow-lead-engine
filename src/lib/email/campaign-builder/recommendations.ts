/**
 * Phase 25D — AI campaign recommendations (deterministic, AI-optional later).
 */

import type { CampaignRecommendation } from "@/lib/email/campaign-builder/types";
import type { EmailCampaignRow } from "@/lib/email/campaign/queries";
import { scoreSubjectLine } from "@/lib/email/campaign-builder/scores";

export function buildCampaignRecommendations(input: {
  campaign: EmailCampaignRow;
  subject?: string | null;
  bodyLength?: number;
  openRate?: number | null;
  clickRate?: number | null;
}): CampaignRecommendation[] {
  const recs: CampaignRecommendation[] = [];
  const subject = input.subject?.trim() || input.campaign.template_subject_snapshot;
  const settings =
    input.campaign.settings_json &&
    typeof input.campaign.settings_json === "object" &&
    !Array.isArray(input.campaign.settings_json)
      ? (input.campaign.settings_json as Record<string, unknown>)
      : {};

  if (subject) {
    const score = scoreSubjectLine(subject);
    if (score.overall < 55 || score.spamRisk > 40) {
      recs.push({
        id: "improve-subject",
        action: "Improve subject line",
        priority: "high",
        rationale: score.rationale[0] ?? "Subject scoring suggests room to improve.",
      });
    }
    if (score.personalization < 40) {
      recs.push({
        id: "increase-personalization",
        action: "Increase personalization",
        priority: "medium",
        rationale: "Add merge fields such as {{first_name}} or {{company}}.",
      });
    }
  }

  if ((input.bodyLength ?? 0) > 1800) {
    recs.push({
      id: "shorten-email",
      action: "Shorten email",
      priority: "medium",
      rationale: "Longer bodies often reduce reply rates for cold outreach.",
    });
  }

  const timezone =
    input.campaign.timezone ||
    (typeof settings.timezone === "string" ? settings.timezone : null);
  if (!timezone || timezone === "UTC") {
    recs.push({
      id: "send-earlier",
      action: "Send earlier",
      priority: "low",
      rationale: "Set a recipient-local timezone and morning send window.",
    });
  }

  if (input.campaign.status === "running" && (input.openRate ?? 100) < 12) {
    recs.push({
      id: "pause-campaign",
      action: "Pause campaign",
      priority: "high",
      rationale: "Open rate is below typical B2B baseline — review audience and subject.",
    });
  }

  if (
    input.campaign.status === "approved" ||
    input.campaign.status === "ready"
  ) {
    recs.push({
      id: "split-campaign",
      action: "Split campaign",
      priority: "medium",
      rationale: "Create an A/B subject test before full enrollment.",
    });
  }

  if (
    input.campaign.status === "completed" &&
    (input.clickRate ?? 0) >= 3
  ) {
    recs.push({
      id: "duplicate-successful",
      action: "Duplicate successful campaign",
      priority: "medium",
      rationale: "Reuse this pattern for a similar audience segment.",
    });
  }

  if (recs.length === 0) {
    recs.push({
      id: "baseline",
      action: "Increase personalization",
      priority: "low",
      rationale: "Campaign looks healthy — personalization is still the highest-ROI lever.",
    });
  }

  return recs.slice(0, 6);
}
