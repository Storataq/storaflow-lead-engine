/**
 * Weighted lead scoring engine (deterministic; AI-optional later).
 */

import {
  BUYING_READINESS_VALUES,
  DEFAULT_CATEGORY_WEIGHTS,
  DEFAULT_CLASSIFICATION_RANGES,
  SCORING_CATEGORIES,
  SCORING_CATEGORY_LABELS,
  classificationFromScore,
  opportunityBandFromScore,
  type BuyingReadiness,
  type ScoringCategory,
  type SubScoreKey,
} from "@/lib/crm/lead-scoring/constants";
import type { LeadScoringSignals } from "@/lib/crm/lead-scoring/signals";
import type {
  CategoryScore,
  ExplanationItem,
  LeadScoringResult,
  NextBestActionItem,
  RiskItem,
} from "@/lib/crm/lead-scoring/types";

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function avg(nums: number[]) {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export type ScoringSettingsInput = {
  weights?: Partial<Record<ScoringCategory, number>>;
  classificationRanges?: Partial<typeof DEFAULT_CLASSIFICATION_RANGES>;
};

function categoryScore(
  category: ScoringCategory,
  score: number,
  weight: number,
  rationale: string,
): CategoryScore {
  const s = clamp(score);
  return {
    category,
    score: s,
    weight,
    weighted: Math.round((s * weight) / 100),
    rationale,
  };
}

export function computeLeadScore(
  signals: LeadScoringSignals,
  settings: ScoringSettingsInput = {},
): LeadScoringResult {
  const weights = {
    ...DEFAULT_CATEGORY_WEIGHTS,
    ...settings.weights,
  };
  const ranges = {
    ...DEFAULT_CLASSIFICATION_RANGES,
    ...settings.classificationRanges,
  };

  const hasWebsite = Boolean(signals.website?.trim());
  const hasEmail = Boolean(signals.email?.trim());
  const hasPhone = Boolean(signals.phone?.trim());
  const ci = signals.companyIntelligence;
  const contacts = signals.contacts;

  const websiteQuality =
    ci.websiteQuality ??
    (hasWebsite ? 55 : 10) + (ci.healthScore != null ? ci.healthScore * 0.2 : 0);

  const websiteTech = hasWebsite ? (ci.healthScore != null ? 50 + ci.healthScore * 0.3 : 45) : 15;
  const seo = hasWebsite ? (ci.leadPotential != null ? 40 + ci.leadPotential * 0.25 : 40) : 10;
  const social = ci.hasSocial ? 70 : hasWebsite ? 25 : 10;

  const businessCompleteness =
    (signals.industry ? 25 : 0) +
    (signals.country || signals.city ? 20 : 0) +
    (hasWebsite ? 20 : 0) +
    (signals.companyName ? 15 : 0) +
    (ci.healthScore != null ? 20 : 0);

  const contactCompleteness =
    (hasEmail ? 30 : 0) +
    (hasPhone ? 20 : 0) +
    Math.min(30, contacts.withEmail * 10 + contacts.withPhone * 5) +
    (contacts.avgQuality ?? 0) * 0.2;

  const decisionMakers =
    contacts.decisionMakers > 0
      ? Math.min(95, 55 + contacts.decisionMakers * 15)
      : contacts.count > 0
        ? 35
        : 15;

  const industryMatch = signals.industry ? 65 : 30;
  const companySize =
    signals.dealValue > 50000 ? 75 : signals.dealValue > 10000 ? 55 : 40;
  const revenueEstimate =
    signals.campaignReady.opportunity != null
      ? signals.campaignReady.opportunity
      : companySize;
  const employeeEstimate = contacts.count >= 3 ? 60 : contacts.count >= 1 ? 45 : 25;
  const geographic = signals.country || signals.city ? 60 : 30;

  const activity =
    30 +
    Math.min(40, signals.crmActivity.openTasks * 8) +
    Math.min(20, signals.crmActivity.openDeals * 10);

  const emailEngagement =
    signals.emailEngagement.sent > 0
      ? Math.min(
          90,
          40 +
            signals.emailEngagement.opened * 10 +
            signals.emailEngagement.clicked * 15 +
            signals.emailEngagement.replied * 20,
        )
      : 25;

  const campaignEngagement =
    signals.campaignReady.qualification != null
      ? clamp(
          (signals.campaignReady.qualification +
            (signals.campaignReady.opportunity ?? 40) +
            (signals.campaignReady.priority ?? 40)) /
            3,
        )
      : 30;

  const crmActivity = clamp(activity);
  const historicalSuccess = clamp(
    signals.existingLeadScore * 0.5 + (signals.status === "qualified" ? 30 : 15),
  );
  const reviewReputation = ci.hasSocial ? 55 : 30;
  const growthSignals = clamp(35 + ci.growthCount * 12 + (ci.leadPotential ?? 0) * 0.2);
  const aiConfidence = clamp(
    (ci.confidence ?? 40) * 0.6 +
      (contacts.avgHealth != null ? 20 : 0) +
      (ci.healthScore != null ? 20 : 0),
  );

  const rawScores: Record<ScoringCategory, { score: number; rationale: string }> = {
    website_quality: {
      score: websiteQuality,
      rationale: hasWebsite ? "Strong website" : "Missing website",
    },
    website_technology: {
      score: websiteTech,
      rationale: hasWebsite ? "Website technology signals present" : "No website technology signals",
    },
    seo: {
      score: seo,
      rationale: hasWebsite ? "SEO signals inferred from web presence" : "No SEO baseline",
    },
    social_presence: {
      score: social,
      rationale: ci.hasSocial ? "Social presence detected" : "No social presence",
    },
    business_completeness: {
      score: businessCompleteness,
      rationale: signals.industry
        ? "Business profile reasonably complete"
        : "Incomplete business profile",
    },
    contact_completeness: {
      score: contactCompleteness,
      rationale: hasEmail
        ? "Contact channels available"
        : "No verified email",
    },
    decision_makers: {
      score: decisionMakers,
      rationale:
        contacts.decisionMakers > 0
          ? "Decision maker identified"
          : "Poor contact quality / no decision maker",
    },
    industry_match: {
      score: industryMatch,
      rationale: signals.industry ? "Industry known" : "Industry unknown",
    },
    company_size: {
      score: companySize,
      rationale:
        signals.dealValue > 10000
          ? "Meaningful deal value signal"
          : "Small company / low deal value",
    },
    revenue_estimate: {
      score: revenueEstimate,
      rationale: "Revenue/opportunity estimate from readiness & deal value",
    },
    employee_estimate: {
      score: employeeEstimate,
      rationale: `Contact graph size: ${contacts.count}`,
    },
    geographic_region: {
      score: geographic,
      rationale: signals.country || signals.city ? "Region known" : "Region unknown",
    },
    activity: {
      score: activity,
      rationale:
        signals.crmActivity.openTasks + signals.crmActivity.openDeals > 0
          ? "CRM activity present"
          : "Low activity",
    },
    email_engagement: {
      score: emailEngagement,
      rationale:
        signals.emailEngagement.sent > 0
          ? "Email engagement history"
          : "Poor engagement / no sends yet",
    },
    campaign_engagement: {
      score: campaignEngagement,
      rationale:
        signals.campaignReady.qualification != null
          ? "Campaign readiness signals"
          : "No campaign readiness yet",
    },
    crm_activity: {
      score: crmActivity,
      rationale: "CRM tasks and deals activity",
    },
    historical_success: {
      score: historicalSuccess,
      rationale: "Blended from prior lead score & status",
    },
    review_reputation: {
      score: reviewReputation,
      rationale: ci.hasSocial
        ? "Reputation proxies from presence"
        : "Limited reputation signals",
    },
    growth_signals: {
      score: growthSignals,
      rationale:
        ci.growthCount > 0 ? "Growing company signals" : "Few growth signals",
    },
    ai_confidence: {
      score: aiConfidence,
      rationale: "Confidence from intelligence coverage",
    },
  };

  const categoryScores: CategoryScore[] = SCORING_CATEGORIES.map((cat) =>
    categoryScore(
      cat,
      rawScores[cat].score,
      weights[cat],
      rawScores[cat].rationale,
    ),
  );

  const weightSum = SCORING_CATEGORIES.reduce((n, c) => n + weights[c], 0) || 1;
  const overallScore = clamp(
    SCORING_CATEGORIES.reduce(
      (sum, c) => sum + (rawScores[c].score * weights[c]) / weightSum,
      0,
    ),
  );

  const classification = classificationFromScore(overallScore, ranges);

  const opportunityRaw = clamp(
    avg([
      rawScores.revenue_estimate.score,
      rawScores.decision_makers.score,
      rawScores.campaign_engagement.score,
      rawScores.growth_signals.score,
      ci.leadPotential ?? overallScore * 0.8,
    ]),
  );
  const opportunityBand = opportunityBandFromScore(opportunityRaw);
  const opportunityConfidence = clamp(aiConfidence * 0.7 + (hasEmail ? 15 : 0));

  const risks: RiskItem[] = [];
  if (!hasWebsite) {
    risks.push({
      code: "no_website",
      label: "No website",
      severity: "high",
    });
  }
  if (!hasEmail) {
    risks.push({
      code: "no_verified_email",
      label: "No verified email",
      severity: "high",
    });
  }
  if (contacts.count === 0) {
    risks.push({
      code: "missing_contact",
      label: "Missing contact information",
      severity: "high",
    });
  }
  if (rawScores.activity.score < 40) {
    risks.push({
      code: "low_activity",
      label: "Low activity",
      severity: "medium",
    });
  }
  if (rawScores.email_engagement.score < 35) {
    risks.push({
      code: "poor_engagement",
      label: "Poor engagement",
      severity: "medium",
    });
  }
  if (rawScores.company_size.score < 40) {
    risks.push({
      code: "small_company",
      label: "Small company",
      severity: "low",
    });
  }
  if (!signals.ownerUserId) {
    risks.push({
      code: "no_owner",
      label: "Inactive ownership / unassigned",
      severity: "medium",
    });
  }

  const riskScore = clamp(
    risks.reduce(
      (n, r) => n + (r.severity === "high" ? 22 : r.severity === "medium" ? 12 : 6),
      0,
    ),
  );

  let buyingReadiness: BuyingReadiness = "unknown";
  if (classification === "very_hot" || classification === "hot") {
    buyingReadiness = opportunityRaw >= 70 ? "ready_now" : "ready_soon";
  } else if (classification === "warm") {
    buyingReadiness = "researching";
  } else if (classification === "cold") {
    buyingReadiness = "long_term";
  } else {
    buyingReadiness = BUYING_READINESS_VALUES.includes("unknown")
      ? "unknown"
      : "long_term";
  }

  const explanations: ExplanationItem[] = [];
  for (const cat of categoryScores) {
    if (cat.score >= 65) {
      explanations.push({
        code: cat.category,
        label: cat.rationale || SCORING_CATEGORY_LABELS[cat.category],
        sentiment: "positive",
      });
    } else if (cat.score < 35) {
      explanations.push({
        code: cat.category,
        label: cat.rationale || SCORING_CATEGORY_LABELS[cat.category],
        sentiment: "negative",
      });
    }
  }
  // Prefer concise top reasons
  const sortedExpl = [
    ...explanations.filter((e) => e.sentiment === "positive"),
    ...explanations.filter((e) => e.sentiment === "negative"),
  ].slice(0, 8);

  const nextBestActions: NextBestActionItem[] = [];
  if (classification === "very_hot" || classification === "hot") {
    nextBestActions.push({
      id: "call",
      action: "Call immediately",
      priority: "high",
      rationale: "Lead classification is hot — act while intent is high.",
    });
    nextBestActions.push({
      id: "demo",
      action: "Schedule demo",
      priority: "high",
      rationale: "Convert heat into a booked conversation.",
    });
  }
  if (opportunityRaw >= 70) {
    nextBestActions.push({
      id: "proposal",
      action: "Send proposal",
      priority: "medium",
      rationale: "Opportunity band supports a commercial proposal.",
    });
  }
  if (hasEmail && campaignEngagement >= 40) {
    nextBestActions.push({
      id: "enroll",
      action: "Enroll campaign",
      priority: "medium",
      rationale: "Eligible for nurturing / outreach enrollment.",
    });
  }
  if (!hasWebsite || contacts.decisionMakers === 0) {
    nextBestActions.push({
      id: "research",
      action: "Research company",
      priority: "medium",
      rationale: "Fill gaps before aggressive outreach.",
    });
  }
  if (!signals.ownerUserId) {
    nextBestActions.push({
      id: "assign",
      action: "Assign sales owner",
      priority: "high",
      rationale: "Unassigned leads stall — ownership unlocks follow-up.",
    });
  }
  if (classification === "warm") {
    nextBestActions.push({
      id: "wait",
      action: "Wait one week",
      priority: "low",
      rationale: "Warm leads benefit from paced nurture.",
    });
  }
  if (nextBestActions.length === 0) {
    nextBestActions.push({
      id: "research-default",
      action: "Research company",
      priority: "low",
      rationale: "Gather more signals before scoring confidence rises.",
    });
  }

  const subScores: Record<SubScoreKey, number> = {
    website: clamp(
      avg([
        rawScores.website_quality.score,
        rawScores.website_technology.score,
        rawScores.seo.score,
      ]),
    ),
    contact: clamp(
      avg([
        rawScores.contact_completeness.score,
        rawScores.decision_makers.score,
      ]),
    ),
    company: clamp(
      avg([
        rawScores.business_completeness.score,
        rawScores.company_size.score,
        rawScores.industry_match.score,
        rawScores.geographic_region.score,
      ]),
    ),
    marketing: clamp(
      avg([
        rawScores.social_presence.score,
        rawScores.seo.score,
        rawScores.campaign_engagement.score,
      ]),
    ),
    sales: clamp(
      avg([
        rawScores.revenue_estimate.score,
        rawScores.historical_success.score,
        rawScores.decision_makers.score,
      ]),
    ),
    engagement: clamp(
      avg([
        rawScores.email_engagement.score,
        rawScores.campaign_engagement.score,
        rawScores.crm_activity.score,
      ]),
    ),
    growth: clamp(
      avg([rawScores.growth_signals.score, rawScores.employee_estimate.score]),
    ),
    relationship: clamp(
      avg([
        rawScores.crm_activity.score,
        rawScores.review_reputation.score,
        rawScores.activity.score,
      ]),
    ),
  };

  return {
    overallScore,
    classification,
    opportunityBand,
    opportunityConfidence,
    riskScore,
    buyingReadiness,
    confidence: clamp(aiConfidence),
    categoryScores,
    subScores,
    explanations: sortedExpl,
    risks,
    nextBestActions: nextBestActions.slice(0, 6),
    signalsSummary: {
      hasWebsite,
      hasEmail,
      hasPhone,
      contactCount: contacts.count,
      decisionMakers: contacts.decisionMakers,
      companyHealth: ci.healthScore,
      leadPotential: ci.leadPotential,
    },
    weightsSnapshot: weights,
    provider: "deterministic",
    model: "lead-scoring-v1",
  };
}
