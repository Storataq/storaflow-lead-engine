/**
 * Recommendation + optimization engine.
 */

import type { MarketingRecommendation } from "@/lib/marketing-agent/types";
import type { MarketingAnalytics } from "@/lib/marketing-agent/types";

export function buildRecommendations(params: {
  analytics: MarketingAnalytics;
  activeCampaigns: number;
  topSubject?: string | null;
  topSegment?: string | null;
}): MarketingRecommendation[] {
  const recs: MarketingRecommendation[] = [];
  const a = params.analytics;

  recs.push({
    type: "send_time",
    title: "Beste verzendtijd: dinsdag–donderdag 09:00–11:00",
    rationale: "B2B open rates pieken midweek ochtend in EU-tijdzones.",
    priority: 72,
    payload: { windows: ["Tue 09:00", "Wed 10:00", "Thu 09:30"] },
  });

  if (params.topSegment) {
    recs.push({
      type: "audience",
      title: `Focus op segment: ${params.topSegment}`,
      rationale: "Hoogste engagement / AI score in recente data.",
      priority: 78,
      payload: { segment: params.topSegment },
    });
  }

  if (a.openRate < 0.2) {
    recs.push({
      type: "subject",
      title: "Verbeter onderwerpregels — A/B test 2 kortere varianten",
      rationale: `Open rate ${(a.openRate * 100).toFixed(1)}% is onder target (25%).`,
      priority: 88,
      payload: {
        suggestion: params.topSubject
          ? `Variant van: ${params.topSubject}`
          : "Persoonlijker + benefit-first",
      },
    });
  } else {
    recs.push({
      type: "subject",
      title: "Behoud winnende subject style, test 1 nieuw haakje",
      rationale: `Open rate ${(a.openRate * 100).toFixed(1)}% is gezond.`,
      priority: 55,
      payload: {},
    });
  }

  if (a.clickRate < 0.03) {
    recs.push({
      type: "cta",
      title: "Versterk CTA: één primaire actie above the fold",
      rationale: `Click rate ${(a.clickRate * 100).toFixed(1)}% is laag.`,
      priority: 85,
      payload: { ctaIdeas: ["Plan demo", "Download checklist", "Bekijk case"] },
    });
  }

  recs.push({
    type: "channel",
    title: a.engagementScore >= 60 ? "Email + LinkedIn multi-channel" : "Start met email only",
    rationale: "Kies kanaalmix op engagement en capaciteit.",
    priority: 60,
    payload: {},
  });

  recs.push({
    type: "frequency",
    title: a.bounceRate > 0.02 ? "Verlaag frequentie tot 1×/week" : "Houd 2–3 touches / week voor nurture",
    rationale: `Bounce ${(a.bounceRate * 100).toFixed(1)}% · engagement ${a.engagementScore}.`,
    priority: 64,
    payload: {},
  });

  if (params.activeCampaigns === 0) {
    recs.push({
      type: "campaign",
      title: "Start een Lead Nurturing campagne",
      rationale: "Geen actieve campagnes — nurturing levert snel pipeline impact.",
      priority: 90,
      payload: { campaignType: "lead_nurturing" },
    });
  }

  if (a.campaignScore < 60) {
    recs.push({
      type: "optimization",
      title: "Optimaliseer: segment aanscherpen + subject A/B + CTA",
      rationale: `Campaign score ${a.campaignScore} onder drempel.`,
      priority: 82,
      payload: { actions: ["segment", "subject_ab", "cta"] },
    });
  }

  return recs.sort((x, y) => y.priority - x.priority);
}

export function optimizeCampaignHints(analytics: MarketingAnalytics): string[] {
  const hints: string[] = [];
  if (analytics.openRate < 0.22) hints.push("Pas verzendtijd aan naar midweek ochtend");
  if (analytics.clickRate < 0.04) hints.push("Wijzig CTA naar één duidelijke actie");
  if (analytics.bounceRate > 0.025) hints.push("Schoon segment op / validatie e-mails");
  if (analytics.conversionRate < 0.01) hints.push("Verbeter landing + offer alignment");
  if (hints.length === 0) {
    hints.push("Schaal winnende variant en verhoog volume geleidelijk");
  }
  return hints;
}
