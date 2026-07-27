/**
 * Marketing analytics aggregation helpers.
 */

import type { MarketingAnalytics } from "@/lib/marketing-agent/types";

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export function computeMarketingAnalytics(input: {
  emailsSent?: number;
  opens?: number;
  clicks?: number;
  bounces?: number;
  conversions?: number;
  cost?: number;
  revenue?: number;
  newLeads?: number;
  pipelineImpact?: number;
}): MarketingAnalytics {
  const sent = Math.max(0, input.emailsSent ?? 0);
  const opens = Math.max(0, input.opens ?? 0);
  const clicks = Math.max(0, input.clicks ?? 0);
  const bounces = Math.max(0, input.bounces ?? 0);
  const conversions = Math.max(0, input.conversions ?? 0);
  const cost = Math.max(0, input.cost ?? 0);
  const revenue = Math.max(0, input.revenue ?? 0);

  const openRate = sent === 0 ? 0 : clamp01(opens / sent);
  const clickRate = sent === 0 ? 0 : clamp01(clicks / sent);
  const bounceRate = sent === 0 ? 0 : clamp01(bounces / sent);
  const conversionRate = sent === 0 ? 0 : clamp01(conversions / sent);
  const roi = cost === 0 ? (revenue > 0 ? revenue : 0) : (revenue - cost) / cost;

  const campaignScore = Math.round(
    Math.max(
      5,
      Math.min(
        100,
        openRate * 35 +
          clickRate * 120 +
          conversionRate * 200 +
          (1 - bounceRate) * 20 +
          Math.min(15, roi * 5),
      ),
    ),
  );

  const engagementScore = Math.round(
    Math.max(0, Math.min(100, openRate * 50 + clickRate * 200 + conversionRate * 150)),
  );

  return {
    openRate,
    clickRate,
    bounceRate,
    conversionRate,
    roi: Math.round(roi * 1000) / 1000,
    campaignScore,
    engagementScore,
    leadGrowth: input.newLeads ?? 0,
    pipelineImpact: input.pipelineImpact ?? 0,
    revenueImpact: revenue,
  };
}

export function emptyAnalytics(): MarketingAnalytics {
  return computeMarketingAnalytics({});
}
