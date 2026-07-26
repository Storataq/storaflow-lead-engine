/**
 * Mock Lead Qualification Engine.
 * Uses existing CRM lead fields + deterministic mock signals.
 * Swap scoring internals later without changing UI contracts.
 */

import type { CrmLeadWithRelations } from "@/lib/crm/queries";
import type {
  LeadClassification,
  LeadPriority,
  LeadQualification,
  LeadScore,
  LeadScoreFactor,
  NextBestAction,
  NextBestActionType,
  OpportunityScore,
  QualificationHistoryEvent,
  QualificationMetrics,
  Recommendation,
  SalesProbability,
} from "@/lib/crm/qualification/types";

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function stableSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) % 10_000;
  }
  return Math.abs(hash);
}

function scoreColor(total: number): LeadScore["color"] {
  if (total >= 75) return "green";
  if (total >= 50) return "orange";
  if (total >= 25) return "red";
  return "slate";
}

function buildScoreFactors(lead: CrmLeadWithRelations): LeadScoreFactor[] {
  const seed = stableSeed(lead.id);
  const reviewCount = seed % 40;
  const companyAgeYears = 3 + (seed % 25);
  const hasAddress = hasText(lead.city) || hasText(lead.country);
  const socialCount =
    (hasText(lead.website) ? 1 : 0) +
    (hasText(lead.industry) ? 1 : 0) +
    (hasText(lead.email) ? 1 : 0);
  const onlinePresence = hasText(lead.website) || socialCount >= 2;
  const completenessFields = [
    lead.website,
    lead.email,
    lead.phone,
    lead.city,
    lead.country,
    lead.industry,
    lead.contact_name,
  ];
  const completeness =
    completenessFields.filter((field) => hasText(field)).length /
    completenessFields.length;

  const sizeKnown = Number(lead.deal_value) > 0 || hasText(lead.industry);

  return [
    {
      key: "website",
      label: "Website Available",
      points: hasText(lead.website) ? 12 : 0,
      maxPoints: 12,
      active: hasText(lead.website),
      weight: 12,
    },
    {
      key: "email",
      label: "Email Available",
      points: hasText(lead.email) ? 14 : 0,
      maxPoints: 14,
      active: hasText(lead.email),
      weight: 14,
    },
    {
      key: "phone",
      label: "Phone Available",
      points: hasText(lead.phone) ? 12 : 0,
      maxPoints: 12,
      active: hasText(lead.phone),
      weight: 12,
    },
    {
      key: "address",
      label: "Address Available",
      points: hasAddress ? 8 : 0,
      maxPoints: 8,
      active: hasAddress,
      weight: 8,
    },
    {
      key: "category",
      label: "Business Category",
      points: hasText(lead.industry) ? 8 : 0,
      maxPoints: 8,
      active: hasText(lead.industry),
      weight: 8,
    },
    {
      key: "reviews",
      label: "Review Count",
      points: clamp((reviewCount / 40) * 8),
      maxPoints: 8,
      active: reviewCount > 0,
      weight: 8,
    },
    {
      key: "company_size",
      label: "Company Size",
      points: sizeKnown ? 8 : 2,
      maxPoints: 8,
      active: sizeKnown,
      weight: 8,
    },
    {
      key: "company_age",
      label: "Company Age",
      points: clamp((companyAgeYears / 28) * 6),
      maxPoints: 6,
      active: true,
      weight: 6,
    },
    {
      key: "online_presence",
      label: "Online Presence",
      points: onlinePresence ? 10 : 0,
      maxPoints: 10,
      active: onlinePresence,
      weight: 10,
    },
    {
      key: "social",
      label: "Social Profiles",
      points: clamp(socialCount * 3),
      maxPoints: 9,
      active: socialCount > 0,
      weight: 9,
    },
    {
      key: "completeness",
      label: "Data Completeness",
      points: clamp(completeness * 15),
      maxPoints: 15,
      active: completeness > 0,
      weight: 15,
    },
  ];
}

function buildLeadScore(lead: CrmLeadWithRelations): LeadScore {
  const factors = buildScoreFactors(lead);
  const raw = factors.reduce((sum, factor) => sum + factor.points, 0);
  const blended = clamp(Math.max(raw, Number(lead.lead_score) || 0));
  return {
    total: blended,
    percentage: blended,
    color: scoreColor(blended),
    factors,
    calculatedAt: new Date().toISOString(),
  };
}

function buildOpportunityScore(lead: CrmLeadWithRelations): OpportunityScore {
  const seed = stableSeed(`${lead.id}:opp`);
  const businessSize = Number(lead.deal_value) > 0
    ? clamp(Math.min(100, Number(lead.deal_value) / 200))
    : 35 + (seed % 30);
  const industry = hasText(lead.industry) ? 70 + (seed % 25) : 25 + (seed % 20);
  const dataQuality = clamp(
    ([lead.website, lead.email, lead.phone, lead.city, lead.industry].filter(
      (v) => hasText(v),
    ).length /
      5) *
      100,
  );
  const marketPresence = hasText(lead.website) ? 65 + (seed % 25) : 20 + (seed % 25);
  const websiteQuality = hasText(lead.website)
    ? lead.website!.startsWith("https") || !lead.website!.includes("http")
      ? 75 + (seed % 20)
      : 50 + (seed % 20)
    : 15 + (seed % 15);

  const factors = [
    { key: "business_size", label: "Business Size", score: businessSize, weight: 0.2 },
    { key: "industry", label: "Industry", score: industry, weight: 0.2 },
    { key: "data_quality", label: "Data Quality", score: dataQuality, weight: 0.25 },
    { key: "market_presence", label: "Market Presence", score: marketPresence, weight: 0.2 },
    { key: "website_quality", label: "Website Quality", score: websiteQuality, weight: 0.15 },
  ];

  const total = clamp(
    factors.reduce((sum, factor) => sum + factor.score * factor.weight, 0),
  );

  return {
    total,
    percentage: total,
    factors,
    calculatedAt: new Date().toISOString(),
  };
}

function classify(
  score: number,
  opportunity: number,
): { classification: LeadClassification; qualified: boolean } {
  if (score < 30 && opportunity < 35) {
    return { classification: "unqualified", qualified: false };
  }
  if (score >= 75) return { classification: "hot", qualified: true };
  if (score >= 50) return { classification: "warm", qualified: true };
  if (score >= 30) return { classification: "cold", qualified: true };
  return { classification: "unqualified", qualified: false };
}

function derivePriority(
  score: number,
  opportunity: number,
  classification: LeadClassification,
): LeadPriority {
  if (classification === "unqualified") return "low";
  const blend = (score + opportunity) / 2;
  if (blend >= 80 || classification === "hot") return "critical";
  if (blend >= 65) return "high";
  if (blend >= 45) return "medium";
  return "low";
}

function deriveProbability(
  score: number,
  opportunity: number,
): SalesProbability {
  const blend = (score * 0.55 + opportunity * 0.45);
  if (blend >= 85) return 90;
  if (blend >= 70) return 75;
  if (blend >= 55) return 50;
  if (blend >= 40) return 25;
  return 10;
}

function actionLabel(type: NextBestActionType): string {
  switch (type) {
    case "call_company":
      return "Call Company";
    case "visit_website":
      return "Visit Website";
    case "verify_email":
      return "Verify Email";
    case "research_business":
      return "Research Business";
    case "schedule_follow_up":
      return "Schedule Follow-up";
    case "add_to_campaign":
      return "Add to Campaign";
    case "review_later":
      return "Review Later";
  }
}

function buildNextBestAction(
  lead: CrmLeadWithRelations,
  classification: LeadClassification,
  priority: LeadPriority,
): NextBestAction {
  let primaryType: NextBestActionType = "research_business";
  if (!hasText(lead.email) && hasText(lead.phone)) primaryType = "call_company";
  else if (hasText(lead.email) && !hasText(lead.phone)) primaryType = "verify_email";
  else if (hasText(lead.website) && classification === "warm") {
    primaryType = "visit_website";
  } else if (classification === "hot") primaryType = "schedule_follow_up";
  else if (classification === "unqualified") primaryType = "review_later";
  else if (classification === "cold") primaryType = "add_to_campaign";

  const alternativesPool: NextBestActionType[] = [
    "call_company",
    "visit_website",
    "verify_email",
    "research_business",
    "schedule_follow_up",
    "add_to_campaign",
    "review_later",
  ].filter((type) => type !== primaryType) as NextBestActionType[];

  const primary: Recommendation = {
    id: `${lead.id}:nba-primary`,
    type: primaryType,
    label: actionLabel(primaryType),
    rationale: `Mock recommendation based on ${classification} classification and available contact data.`,
    priority,
  };

  const alternatives = alternativesPool.slice(0, 3).map((type, index) => ({
    id: `${lead.id}:nba-${index}`,
    type,
    label: actionLabel(type),
    rationale: "Alternative mock action for sales workflow.",
    priority: index === 0 ? priority : "medium",
  }));

  return { primary, alternatives };
}

function buildHistory(lead: CrmLeadWithRelations): QualificationHistoryEvent[] {
  const created = lead.created_at;
  const updated = lead.updated_at;
  const seed = stableSeed(lead.id);
  const mid = new Date(
    (new Date(created).getTime() + new Date(updated).getTime()) / 2,
  ).toISOString();

  const events: QualificationHistoryEvent[] = [
    {
      id: `${lead.id}:created`,
      type: "lead_created",
      label: "Lead Created",
      description: `${lead.company_name} toegevoegd aan CRM`,
      occurredAt: created,
    },
  ];

  if (seed % 3 !== 0) {
    events.push({
      id: `${lead.id}:qualified`,
      type: "qualified",
      label: "Qualified",
      description: "Mock qualification pass voltooid",
      occurredAt: mid,
    });
  }

  if (seed % 2 === 0) {
    events.push({
      id: `${lead.id}:reviewed`,
      type: "reviewed",
      label: "Reviewed",
      description: "Lead beoordeeld door sales (mock)",
      occurredAt: updated,
    });
  }

  if (lead.owner_user_id) {
    events.push({
      id: `${lead.id}:assigned`,
      type: "assigned",
      label: "Assigned",
      description: "Lead toegewezen aan eigenaar",
      occurredAt: updated,
    });
  }

  if (seed % 4 === 0) {
    events.push({
      id: `${lead.id}:contact`,
      type: "contact_planned",
      label: "Contact Planned",
      description: "Follow-up gepland (mock)",
      occurredAt: updated,
    });
  }

  if (seed % 5 === 0) {
    events.push({
      id: `${lead.id}:campaign`,
      type: "campaign_ready",
      label: "Campaign Ready",
      description: "Klaar voor campagnelijst (mock)",
      occurredAt: updated,
    });
  }

  return events.sort(
    (a, b) =>
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );
}

function strengthsAndWeaknesses(
  factors: LeadScoreFactor[],
): { strengths: string[]; weaknesses: string[] } {
  const strengths = factors
    .filter((factor) => factor.active && factor.points >= factor.maxPoints * 0.6)
    .map((factor) => factor.label)
    .slice(0, 4);
  const weaknesses = factors
    .filter((factor) => !factor.active || factor.points < factor.maxPoints * 0.4)
    .map((factor) => factor.label)
    .slice(0, 4);
  return {
    strengths: strengths.length ? strengths : ["Basisprofiel aanwezig"],
    weaknesses: weaknesses.length ? weaknesses : ["Geen zwakke punten gedetecteerd"],
  };
}

export function qualifyLead(lead: CrmLeadWithRelations): LeadQualification {
  const score = buildLeadScore(lead);
  const opportunity = buildOpportunityScore(lead);
  const { classification, qualified } = classify(score.total, opportunity.total);
  const priority = derivePriority(score.total, opportunity.total, classification);
  const salesProbability = deriveProbability(score.total, opportunity.total);
  const nextBestAction = buildNextBestAction(lead, classification, priority);
  const history = buildHistory(lead);
  const { strengths, weaknesses } = strengthsAndWeaknesses(score.factors);
  const confidence = clamp(
    score.percentage * 0.5 +
      opportunity.percentage * 0.3 +
      (qualified ? 15 : 0) +
      (lead.owner_user_id ? 5 : 0),
  );
  const profileCompleteness = clamp(
    (score.factors.filter((f) => f.active).length / score.factors.length) * 100,
  );

  return {
    leadId: lead.id,
    companyName: lead.company_name,
    score,
    opportunity,
    confidence,
    classification,
    qualified,
    priority,
    salesProbability,
    nextBestAction,
    history,
    strengths,
    weaknesses,
    profileCompleteness,
    updatedAt: lead.updated_at,
  };
}

export function qualifyLeads(
  leads: CrmLeadWithRelations[],
): LeadQualification[] {
  return leads
    .map(qualifyLead)
    .sort((a, b) => b.score.total - a.score.total);
}

export function buildQualificationMetrics(
  items: LeadQualification[],
): QualificationMetrics {
  const priorityCounts: Record<LeadPriority, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  const probabilityDistribution: Record<SalesProbability, number> = {
    10: 0,
    25: 0,
    50: 0,
    75: 0,
    90: 0,
  };

  for (const item of items) {
    priorityCounts[item.priority] += 1;
    probabilityDistribution[item.salesProbability] += 1;
  }

  const averageQualificationScore =
    items.length === 0
      ? 0
      : clamp(
          items.reduce((sum, item) => sum + item.score.total, 0) / items.length,
        );

  const conversionPotential =
    items.length === 0
      ? 0
      : clamp(
          items.reduce((sum, item) => sum + item.salesProbability, 0) /
            items.length,
        );

  return {
    totalLeads: items.length,
    qualifiedLeads: items.filter((item) => item.qualified).length,
    unqualifiedLeads: items.filter((item) => !item.qualified).length,
    hotLeads: items.filter((item) => item.classification === "hot").length,
    warmLeads: items.filter((item) => item.classification === "warm").length,
    coldLeads: items.filter((item) => item.classification === "cold").length,
    averageQualificationScore,
    conversionPotential,
    priorityCounts,
    probabilityDistribution,
  };
}

export function buildInsightCards(items: LeadQualification[]) {
  if (items.length === 0) {
    return {
      highestScore: null,
      lowestScore: null,
      fastestQualification: null,
      mostCompleteProfile: null,
      highestOpportunity: null,
      lowestConfidence: null,
    };
  }

  const byScoreDesc = [...items].sort((a, b) => b.score.total - a.score.total);
  const byScoreAsc = [...items].sort((a, b) => a.score.total - b.score.total);
  const byCompleteness = [...items].sort(
    (a, b) => b.profileCompleteness - a.profileCompleteness,
  );
  const byOpportunity = [...items].sort(
    (a, b) => b.opportunity.total - a.opportunity.total,
  );
  const byConfidence = [...items].sort((a, b) => a.confidence - b.confidence);
  const byHistory = [...items].sort(
    (a, b) => b.history.length - a.history.length,
  );

  return {
    highestScore: byScoreDesc[0] ?? null,
    lowestScore: byScoreAsc[0] ?? null,
    fastestQualification: byHistory[0] ?? null,
    mostCompleteProfile: byCompleteness[0] ?? null,
    highestOpportunity: byOpportunity[0] ?? null,
    lowestConfidence: byConfidence[0] ?? null,
  };
}
