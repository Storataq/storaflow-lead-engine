/**
 * Deterministic Opportunity Insights engine.
 * Consumes Lead Qualification results — does not reimplement that scoring.
 */

import { qualifyLead } from "@/lib/crm/qualification";
import type { LeadQualification } from "@/lib/crm/qualification";
import type { CrmLeadWithRelations } from "@/lib/crm/queries";
import type {
  BuyingSignal,
  ChannelRecommendation,
  CommercialPotential,
  NextBestActionRecommendation,
  OpportunityClassification,
  OpportunityExecutiveInsights,
  OpportunityInsight,
  OpportunityOverviewKpi,
  OpportunityRecord,
  OpportunityRisk,
  OpportunityScore,
  OpportunityScoreBreakdownItem,
  OutreachReadiness,
  PipelineRecommendation,
  RecommendedChannel,
  SalesUrgency,
  SuggestedPipelineStage,
} from "@/lib/crm/opportunity-insights/types";

const AI_META = { isAiGenerated: false as const };

const LEGAL_NOTICE =
  "Outreach readiness is a technical checklist only. You remain responsible for applicable privacy and marketing rules.";

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

function daysSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

function classifyOpportunity(
  score: number,
  incomplete: boolean,
): OpportunityClassification {
  if (incomplete) return "insufficient_data";
  if (score >= 90) return "strategic";
  if (score >= 75) return "high_potential";
  if (score >= 60) return "promising";
  if (score >= 40) return "nurture";
  return "low_potential";
}

function buildScore(
  lead: CrmLeadWithRelations,
  qualification: LeadQualification,
): OpportunityScore {
  const seed = stableSeed(lead.id);
  const contactability =
    (hasText(lead.email) ? 40 : 0) +
    (hasText(lead.phone) ? 35 : 0) +
    (hasText(lead.contact_name) ? 25 : 0);
  const completeness = qualification.profileCompleteness;
  const buyingSignalRaw =
    (hasText(lead.website) ? 30 : 0) +
    (hasText(lead.industry) ? 25 : 0) +
    (qualification.score.total >= 60 ? 25 : 10) +
    (seed % 20);
  const sourceConfidence = clamp(55 + (seed % 35));
  const crmEngagement = lead.owner_user_id
    ? clamp(60 + (seed % 30))
    : clamp(25 + (seed % 25));
  const stageSlug = lead.stage?.slug ?? "";
  const pipelineStageScore = stageSlug.includes("gewonnen")
    ? 95
    : stageSlug.includes("onderhandeling")
      ? 80
      : stageSlug.includes("demo")
        ? 70
        : stageSlug.includes("gekwalificeerd")
          ? 65
          : stageSlug.includes("nieuw")
            ? 40
            : 50;
  const recency = clamp(100 - daysSince(lead.updated_at) * 3);
  const companySizeProxy = Number(lead.deal_value) > 0
    ? clamp(Math.min(100, Number(lead.deal_value) / 150))
    : 35 + (seed % 25);
  const industryRelevance = hasText(lead.industry)
    ? 70 + (seed % 25)
    : 20 + (seed % 20);
  const onlinePresence = hasText(lead.website)
    ? 75 + (seed % 20)
    : 15 + (seed % 20);
  // Website enrichment improves contactability when email/phone were discovered
  const enrichmentBoost =
    (hasText(lead.email) ? 10 : 0) +
    (hasText(lead.phone) ? 8 : 0) +
    (hasText(lead.website) ? 5 : 0);

  const items: Omit<OpportunityScoreBreakdownItem, "weightedContribution">[] = [
    {
      key: "qualification",
      label: "Lead Qualification Score",
      weight: 0.18,
      rawScore: qualification.score.total,
      explanation: "Hergebruikt uit Lead Qualification Engine",
    },
    {
      key: "completeness",
      label: "Company Data Completeness",
      weight: 0.1,
      rawScore: completeness,
      explanation: "Aandeel gevulde CRM-velden",
    },
    {
      key: "contactability",
      label: "Contactability",
      weight: 0.1,
      rawScore: clamp(contactability + enrichmentBoost),
      explanation:
        "E-mail, telefoon, contactpersoon (+ website enrichment signals)",
    },
    {
      key: "website",
      label: "Website Availability",
      weight: 0.06,
      rawScore: hasText(lead.website) ? 90 : 10,
      explanation: "Website aanwezig in leadrecord",
    },
    {
      key: "email",
      label: "Verified Email Availability",
      weight: 0.08,
      rawScore: hasText(lead.email) ? 85 : 5,
      explanation: "E-mail aanwezig (verificatie nog mock)",
    },
    {
      key: "phone",
      label: "Phone Availability",
      weight: 0.06,
      rawScore: hasText(lead.phone) ? 85 : 5,
      explanation: "Telefoonnummer aanwezig",
    },
    {
      key: "company_size",
      label: "Company Size",
      weight: 0.06,
      rawScore: companySizeProxy,
      explanation: "Proxy via dealwaarde / mock size",
    },
    {
      key: "industry",
      label: "Industry Relevance",
      weight: 0.07,
      rawScore: industryRelevance,
      explanation: "Branche bekend en relevant (mock)",
    },
    {
      key: "online",
      label: "Online Presence",
      weight: 0.06,
      rawScore: onlinePresence,
      explanation: "Digitale zichtbaarheid (deterministisch)",
    },
    {
      key: "buying_signals",
      label: "Buying Signals",
      weight: 0.08,
      rawScore: clamp(buyingSignalRaw),
      explanation: "Gesimuleerde buying signals",
    },
    {
      key: "source_confidence",
      label: "Source Confidence",
      weight: 0.05,
      rawScore: sourceConfidence,
      explanation: "Mock bronbetrouwbaarheid",
    },
    {
      key: "crm_engagement",
      label: "CRM Engagement",
      weight: 0.04,
      rawScore: crmEngagement,
      explanation: "Eigenaar / activiteit in CRM",
    },
    {
      key: "pipeline_stage",
      label: "Pipeline Stage",
      weight: 0.03,
      rawScore: pipelineStageScore,
      explanation: `Huidige stage: ${lead.stage?.name ?? "onbekend"}`,
    },
    {
      key: "recency",
      label: "Recency of Activity",
      weight: 0.03,
      rawScore: recency,
      explanation: "Dagen sinds laatste update",
    },
  ];

  const breakdown: OpportunityScoreBreakdownItem[] = items.map((item) => ({
    ...item,
    weightedContribution: Number((item.rawScore * item.weight).toFixed(2)),
  }));

  const total = clamp(
    breakdown.reduce((sum, item) => sum + item.weightedContribution, 0),
  );

  return {
    total,
    breakdown,
    calculatedAt: lead.updated_at,
    metadata: { ...AI_META, generatedAt: lead.updated_at, confidence: total },
  };
}

function buildCommercial(
  lead: CrmLeadWithRelations,
  score: number,
  qualification: LeadQualification,
): CommercialPotential {
  const seed = stableSeed(`${lead.id}:value`);
  const base =
    Number(lead.deal_value) > 0
      ? Number(lead.deal_value)
      : 2500 + (seed % 40) * 250;
  const estimatedDealValue = Math.round(base);
  const conversionProbability = clamp(
    qualification.salesProbability * 0.7 + score * 0.3,
  );
  const expectedValue = Math.round(
    (estimatedDealValue * conversionProbability) / 100,
  );
  const estimatedMonthlyValue = Math.round(estimatedDealValue / 12);
  const estimatedAnnualValue = estimatedDealValue;

  let salesUrgency: SalesUrgency = "low";
  if (score >= 85 && conversionProbability >= 70) salesUrgency = "immediate";
  else if (score >= 70) salesUrgency = "high";
  else if (score >= 55) salesUrgency = "medium";
  else if (score < 30) salesUrgency = "none";

  return {
    estimatedDealValue,
    estimatedMonthlyValue,
    estimatedAnnualValue,
    conversionProbability,
    expectedValue,
    salesUrgency,
    suggestedPipelineStage: suggestStage(score, qualification),
    currency: lead.currency || "EUR",
    isEstimate: true,
  };
}

function suggestStage(
  score: number,
  qualification: LeadQualification,
): SuggestedPipelineStage {
  if (!qualification.qualified || score < 30) return "archive";
  if (score >= 85) return "engaged";
  if (score >= 75) return "contact_planned";
  if (score >= 60) return "qualified";
  if (score >= 40) return "nurture";
  return "new";
}

function buildBuyingSignals(
  lead: CrmLeadWithRelations,
  qualification: LeadQualification,
): BuyingSignal[] {
  const detectedAt = lead.updated_at;
  const signals: BuyingSignal[] = [];

  if (hasText(lead.website)) {
    signals.push({
      id: `${lead.id}:sig-website`,
      name: "Active Website",
      strength: 80,
      confidence: 90,
      explanation: "Website aanwezig in CRM (gesimuleerd signaal).",
      source: "crm_lead.website",
      detectedAt,
      polarity: "positive",
      simulated: true,
    });
  }
  if (hasText(lead.email) && hasText(lead.phone)) {
    signals.push({
      id: `${lead.id}:sig-channels`,
      name: "Multiple Contact Channels",
      strength: 85,
      confidence: 88,
      explanation: "E-mail en telefoon beide beschikbaar.",
      source: "crm_lead",
      detectedAt,
      polarity: "positive",
      simulated: true,
    });
  }
  if (qualification.profileCompleteness >= 70) {
    signals.push({
      id: `${lead.id}:sig-complete`,
      name: "High Data Completeness",
      strength: 75,
      confidence: 92,
      explanation: "Profiel is grotendeels gevuld.",
      source: "qualification.profileCompleteness",
      detectedAt,
      polarity: "positive",
      simulated: true,
    });
  }
  if (hasText(lead.contact_name)) {
    signals.push({
      id: `${lead.id}:sig-dm`,
      name: "Decision-Maker Available",
      strength: 70,
      confidence: 70,
      explanation: "Contactpersoon vastgelegd (niet geverifieerd als DM).",
      source: "crm_lead.contact_name",
      detectedAt,
      polarity: "positive",
      simulated: true,
    });
  }
  if (hasText(lead.industry)) {
    signals.push({
      id: `${lead.id}:sig-category`,
      name: "Category Match",
      strength: 65,
      confidence: 60,
      explanation: "Branche bekend — product fit is mock-gescoord.",
      source: "crm_lead.industry",
      detectedAt,
      polarity: "neutral",
      simulated: true,
    });
  }
  if (daysSince(lead.updated_at) <= 7) {
    signals.push({
      id: `${lead.id}:sig-crm`,
      name: "Recent CRM Activity",
      strength: 72,
      confidence: 95,
      explanation: "Lead recent bijgewerkt.",
      source: "crm_lead.updated_at",
      detectedAt,
      polarity: "positive",
      simulated: true,
    });
  }
  if (!hasText(lead.website) && !hasText(lead.email)) {
    signals.push({
      id: `${lead.id}:sig-weak`,
      name: "Limited Digital Presence",
      strength: 40,
      confidence: 80,
      explanation: "Geen website of e-mail — zwak digitaal signaal.",
      source: "crm_lead",
      detectedAt,
      polarity: "negative",
      simulated: true,
    });
  }

  // Deterministic simulated extras (not claimed as live web detection)
  const seed = stableSeed(`${lead.id}:signals`);
  if (seed % 4 === 0) {
    signals.push({
      id: `${lead.id}:sig-growth`,
      name: "Growing Company",
      strength: 55,
      confidence: 35,
      explanation: "Gesimuleerd groeisignaal — geen live detectie.",
      source: "mock_signal_engine",
      detectedAt,
      polarity: "neutral",
      simulated: true,
    });
  }

  return signals;
}

function buildInsights(
  lead: CrmLeadWithRelations,
  qualification: LeadQualification,
  score: number,
): { insights: OpportunityInsight[]; risks: OpportunityRisk[] } {
  const insights: OpportunityInsight[] = [];
  const risks: OpportunityRisk[] = [];

  if (qualification.score.total >= 70) {
    insights.push({
      id: `${lead.id}:str-qual`,
      category: "strength",
      title: "Strong qualification score",
      description: `Qualification score ${qualification.score.total}.`,
      impact: "high",
      confidence: 90,
      recommendedResponse: "Prioriteer outreach.",
      metadata: AI_META,
    });
  }
  if (hasText(lead.email) && hasText(lead.phone)) {
    insights.push({
      id: `${lead.id}:str-channels`,
      category: "strength",
      title: "Multiple communication channels",
      description: "E-mail en telefoon beschikbaar.",
      impact: "medium",
      confidence: 95,
      recommendedResponse: "Kies kanaal op basis van readiness.",
      metadata: AI_META,
    });
  }
  if (qualification.profileCompleteness >= 70) {
    insights.push({
      id: `${lead.id}:str-profile`,
      category: "strength",
      title: "Complete contact profile",
      description: "Hoge profielcompleteness.",
      impact: "medium",
      confidence: 88,
      recommendedResponse: "Geschikt voor gepersonaliseerde outreach.",
      metadata: AI_META,
    });
  }
  if (hasText(lead.industry)) {
    insights.push({
      id: `${lead.id}:str-industry`,
      category: "strength",
      title: "Relevant industry",
      description: `Branche: ${lead.industry}.`,
      impact: "medium",
      confidence: 70,
      recommendedResponse: "Gebruik branche in messaging (mock).",
      metadata: AI_META,
    });
  }

  if (!hasText(lead.email)) {
    insights.push({
      id: `${lead.id}:weak-email`,
      category: "weakness",
      title: "No verified email",
      description: "Geen e-mail in CRM.",
      impact: "high",
      confidence: 95,
      recommendedResponse: "Verifieer of zoek e-mail voordat je campagne start.",
      metadata: AI_META,
    });
  }
  if (!hasText(lead.contact_name)) {
    insights.push({
      id: `${lead.id}:weak-dm`,
      category: "weakness",
      title: "Missing decision-maker",
      description: "Geen contactpersoon vastgelegd.",
      impact: "medium",
      confidence: 90,
      recommendedResponse: "Find Decision-Maker als volgende stap.",
      metadata: AI_META,
    });
  }
  if (qualification.profileCompleteness < 40) {
    insights.push({
      id: `${lead.id}:weak-data`,
      category: "weakness",
      title: "Weak company information",
      description: "Lage data completeness.",
      impact: "high",
      confidence: 85,
      recommendedResponse: "Enrich Company Profile.",
      metadata: AI_META,
    });
  }

  if (score >= 70 && hasText(lead.email)) {
    insights.push({
      id: `${lead.id}:opp-campaign`,
      category: "opportunity",
      title: "Suitable for outbound campaign",
      description: "Hoge score + e-mail aanwezig.",
      impact: "high",
      confidence: 75,
      recommendedResponse: "Add to Outreach Campaign (mock).",
      metadata: AI_META,
    });
  }
  if (Number(lead.deal_value) >= 10000 || score >= 80) {
    insights.push({
      id: `${lead.id}:opp-hva`,
      category: "opportunity",
      title: "High-value account potential",
      description: "Dealwaarde of opportunity score wijst op HVA.",
      impact: "high",
      confidence: 70,
      recommendedResponse: "Strategic nurture / senior outreach.",
      metadata: AI_META,
    });
  }
  if (score >= 60 && daysSince(lead.updated_at) <= 14) {
    insights.push({
      id: `${lead.id}:opp-fast`,
      category: "opportunity",
      title: "Fast conversion potential",
      description: "Recente activiteit + solide score.",
      impact: "medium",
      confidence: 65,
      recommendedResponse: "Schedule follow-up binnen 48u.",
      metadata: AI_META,
    });
  }

  if (!hasText(lead.email) && !hasText(lead.phone)) {
    risks.push({
      id: `${lead.id}:risk-contact`,
      title: "Low response probability",
      description: "Geen bruikbaar contactkanaal.",
      severity: "high",
      confidence: 90,
      recommendedResponse: "Enrich vóór outreach.",
    });
  }
  if (qualification.confidence < 45) {
    risks.push({
      id: `${lead.id}:risk-confidence`,
      title: "Insufficient data",
      description: "Lage qualification confidence.",
      severity: "medium",
      confidence: 80,
      recommendedResponse: "Review Company Data.",
    });
  }
  if (daysSince(lead.updated_at) > 60) {
    risks.push({
      id: `${lead.id}:risk-stale`,
      title: "Contact information may be outdated",
      description: "Geen recente CRM-activiteit (>60 dagen).",
      severity: "medium",
      confidence: 70,
      recommendedResponse: "Verify Email / Phone vóór contact.",
    });
  }

  return { insights, risks };
}

function buildNba(
  lead: CrmLeadWithRelations,
  score: number,
  readiness: OutreachReadiness,
  channel: ChannelRecommendation,
): { primary: NextBestActionRecommendation; secondary: NextBestActionRecommendation } {
  let primaryTitle = "Review Company Data";
  let primaryPriority: NextBestActionRecommendation["priority"] = "medium";
  let reason = "Basiscontrole vóór outreach.";
  let timing = "Deze week";
  let expected = "Schoner opportunity-profiel";
  let prerequisites = ["CRM toegang"];

  if (readiness.status === "excluded" || readiness.status === "blocked") {
    primaryTitle = "Wait Before Contacting";
    primaryPriority = "no_action";
    reason = "Outreach readiness is geblokkeerd of excluded.";
    timing = "Nader te bepalen";
    expected = "Compliance-safe pauze";
    prerequisites = ["Resolve blockers"];
  } else if (!hasText(lead.email) && hasText(lead.phone)) {
    primaryTitle = "Call Company";
    primaryPriority = score >= 70 ? "immediate" : "high";
    reason = "Telefoon beschikbaar, e-mail ontbreekt.";
    timing = "Binnen 24–48 uur";
    expected = "Eerste contact gelegd";
    prerequisites = ["Phone available"];
  } else if (!hasText(lead.email)) {
    primaryTitle = "Verify Email Address";
    primaryPriority = "high";
    reason = "E-mail ontbreekt voor campagne-klaarheid.";
    timing = "Voor campagne";
    expected = "E-mail gevonden of geverifieerd";
    prerequisites = ["Company name"];
  } else if (!hasText(lead.contact_name)) {
    primaryTitle = "Find Decision-Maker";
    primaryPriority = "high";
    reason = "Geen contactpersoon voor personalisatie.";
    timing = "Voor outreach";
    expected = "Decision-maker vastgelegd";
    prerequisites = ["Company website or LinkedIn research"];
  } else if (score >= 75 && readiness.status === "ready") {
    primaryTitle = "Send Introductory Email";
    primaryPriority = "immediate";
    reason = "Hoge opportunity score + ready for outreach.";
    timing = "Vandaag / morgen";
    expected = "Eerste reply of meeting";
    prerequisites = ["Email available", "Compliant messaging"];
  } else if (score >= 60) {
    primaryTitle = "Add to Outreach Campaign";
    primaryPriority = "high";
    reason = "Promising opportunity voor batch outreach.";
    timing = "Deze sprint";
    expected = "In campagne-queue (mock)";
    prerequisites = ["Email available"];
  } else if (hasText(lead.website)) {
    primaryTitle = "Visit Company Website";
    primaryPriority = "medium";
    reason = "Website beschikbaar voor research.";
    timing = "Voor contact";
    expected = "Betere personalisatie";
    prerequisites = ["Website available"];
  } else if (score < 35) {
    primaryTitle = "Archive Opportunity";
    primaryPriority = "low";
    reason = "Lage opportunity score.";
    timing = "Na review";
    expected = "Pipeline opgeschoond";
    prerequisites = ["Manager review"];
  }

  const primary: NextBestActionRecommendation = {
    id: `${lead.id}:nba-primary`,
    title: primaryTitle,
    priority: primaryPriority,
    reason,
    suggestedTiming: timing,
    recommendedChannel: channel.primary,
    expectedOutcome: expected,
    confidence: clamp(55 + score * 0.35),
    prerequisites,
    metadata: AI_META,
  };

  const secondary: NextBestActionRecommendation = {
    id: `${lead.id}:nba-secondary`,
    title: hasText(lead.website)
      ? "Enrich Company Profile"
      : "Create Follow-up Task",
    priority: "medium",
    reason: "Ondersteunende mock-actie naast primary recommendation.",
    suggestedTiming: "Binnen 7 dagen",
    recommendedChannel: channel.alternative,
    expectedOutcome: "Betere data of geplande follow-up",
    confidence: 60,
    prerequisites: ["CRM task permissions"],
    metadata: AI_META,
  };

  return { primary, secondary };
}

function buildReadiness(lead: CrmLeadWithRelations): OutreachReadiness {
  const checklist = [
    {
      key: "email",
      label: "Email available",
      complete: hasText(lead.email),
      required: true,
    },
    {
      key: "email_verification",
      label: "Email verification status",
      complete: hasText(lead.email),
      required: false,
    },
    {
      key: "phone",
      label: "Phone available",
      complete: hasText(lead.phone),
      required: false,
    },
    {
      key: "contact",
      label: "Contact person available",
      complete: hasText(lead.contact_name),
      required: true,
    },
    {
      key: "company",
      label: "Company name available",
      complete: hasText(lead.company_name),
      required: true,
    },
    {
      key: "website",
      label: "Website available",
      complete: hasText(lead.website),
      required: false,
    },
    {
      key: "website_enrichment",
      label: "Website contact discovery signals",
      complete:
        hasText(lead.email) ||
        hasText(lead.phone) ||
        (hasText(lead.website) && hasText(lead.notes)),
      required: false,
    },
    {
      key: "industry",
      label: "Industry known",
      complete: hasText(lead.industry),
      required: false,
    },
    {
      key: "personalization",
      label: "Personalization data available",
      complete: hasText(lead.industry) || hasText(lead.city),
      required: false,
    },
    {
      key: "consent",
      label: "Consent / legal status (placeholder)",
      complete: false,
      required: false,
    },
    {
      key: "confidence",
      label: "Data confidence",
      complete: hasText(lead.email) || hasText(lead.phone),
      required: true,
    },
    {
      key: "duplicate",
      label: "Duplicate check status",
      complete: true,
      required: true,
    },
    {
      key: "exclusion",
      label: "Exclusion status",
      complete: true,
      required: true,
    },
  ];

  const required = checklist.filter((item) => item.required);
  const requiredComplete = required.filter((item) => item.complete).length;
  const allComplete = checklist.filter((item) => item.complete).length;
  const score = clamp(
    (requiredComplete / Math.max(required.length, 1)) * 70 +
      (allComplete / checklist.length) * 30,
  );

  let status: OutreachReadiness["status"] = "needs_enrichment";
  if (score >= 85 && hasText(lead.email)) status = "ready";
  else if (score >= 65) status = "almost_ready";
  else if (!hasText(lead.company_name)) status = "blocked";
  else status = "needs_enrichment";

  return {
    score,
    status,
    checklist,
    notice: LEGAL_NOTICE,
  };
}

function buildChannel(
  lead: CrmLeadWithRelations,
  readiness: OutreachReadiness,
): ChannelRecommendation {
  const missing: string[] = [];
  if (!hasText(lead.email)) missing.push("Email");
  if (!hasText(lead.phone)) missing.push("Phone");
  if (!hasText(lead.contact_name)) missing.push("Contact person");

  let primary: RecommendedChannel = "manual_research";
  let alternative: RecommendedChannel = "no_outreach";
  let reason = "Onvoldoende kanalen — research eerst.";
  let confidence = 40;

  if (readiness.status === "blocked" || readiness.status === "excluded") {
    primary = "no_outreach";
    alternative = "manual_research";
    reason = "Outreach geblokkeerd volgens readiness checklist.";
    confidence = 90;
  } else if (hasText(lead.email) && readiness.score >= 65) {
    primary = "email";
    alternative = hasText(lead.phone) ? "phone" : "website_form";
    reason = "E-mail beschikbaar en readiness voldoende.";
    confidence = 80;
  } else if (hasText(lead.phone)) {
    primary = "phone";
    alternative = hasText(lead.website) ? "website_form" : "manual_research";
    reason = "Telefoon is het sterkste beschikbare kanaal.";
    confidence = 75;
  } else if (hasText(lead.website)) {
    primary = "website_form";
    alternative = "linkedin";
    reason = "Website aanwezig — contactformulier of LinkedIn research.";
    confidence = 55;
  } else {
    primary = "linkedin";
    alternative = "manual_research";
    reason = "Geen e-mail/telefoon — LinkedIn/manual research (mock).";
    confidence = 45;
  }

  return {
    primary,
    alternative,
    reason,
    confidence,
    missingPrerequisites: missing,
  };
}

function buildPipelineRec(
  stage: SuggestedPipelineStage,
  score: number,
): PipelineRecommendation {
  return {
    stage,
    reason: `Voorgesteld op basis van opportunity score ${score} (geen automatische stage-wijziging).`,
    confidence: clamp(50 + score * 0.4),
  };
}

function buildTimeline(
  lead: CrmLeadWithRelations,
  qualification: LeadQualification,
): OpportunityRecord["timeline"] {
  return [
    {
      id: `${lead.id}:tl-discovered`,
      label: "Lead discovered",
      description: "Lead aangemaakt in CRM",
      occurredAt: lead.created_at,
      type: "lead_discovered",
    },
    {
      id: `${lead.id}:tl-enriched`,
      label: "Company enriched",
      description: "Mock enrichment pass (geen live API)",
      occurredAt: lead.created_at,
      type: "company_enriched",
    },
    {
      id: `${lead.id}:tl-qualified`,
      label: "Qualification calculated",
      description: `Score ${qualification.score.total}`,
      occurredAt: lead.updated_at,
      type: "qualification_calculated",
    },
    {
      id: `${lead.id}:tl-opportunity`,
      label: "Opportunity detected",
      description: "Opportunity Insights engine",
      occurredAt: lead.updated_at,
      type: "opportunity_detected",
    },
    {
      id: `${lead.id}:tl-nba`,
      label: "Recommendation generated",
      description: "Next Best Action (deterministic mock)",
      occurredAt: lead.updated_at,
      type: "recommendation_generated",
    },
    ...qualification.history.slice(0, 3).map((event) => ({
      id: `${lead.id}:tl-q-${event.id}`,
      label: event.label,
      description: event.description,
      occurredAt: event.occurredAt,
      type: event.type,
    })),
  ].sort(
    (a, b) =>
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );
}

function matrixQuadrant(
  conversionProbability: number,
  opportunityScore: number,
): OpportunityRecord["matrixQuadrant"] {
  const highProb = conversionProbability >= 50;
  const highScore = opportunityScore >= 60;
  if (highProb && highScore) return "prioritize_now";
  if (!highProb && highScore) return "strategic_nurture";
  if (highProb && !highScore) return "quick_wins";
  return "low_priority";
}

export function buildOpportunityRecord(
  lead: CrmLeadWithRelations,
  qualification?: LeadQualification,
): OpportunityRecord {
  const qual = qualification ?? qualifyLead(lead);
  const score = buildScore(lead, qual);
  const incomplete =
    !hasText(lead.company_name) ||
    (!hasText(lead.email) &&
      !hasText(lead.phone) &&
      !hasText(lead.website) &&
      qual.profileCompleteness < 30);
  const classification = classifyOpportunity(score.total, incomplete);
  const commercial = buildCommercial(lead, score.total, qual);
  const buyingSignals = buildBuyingSignals(lead, qual);
  const { insights, risks } = buildInsights(lead, qual, score.total);
  const outreachReadiness = buildReadiness(lead);
  const channel = buildChannel(lead, outreachReadiness);
  const nextBestActions = buildNba(
    lead,
    score.total,
    outreachReadiness,
    channel,
  );
  const pipelineRecommendation = buildPipelineRec(
    commercial.suggestedPipelineStage,
    score.total,
  );

  return {
    leadId: lead.id,
    companyName: lead.company_name,
    industry: lead.industry,
    email: lead.email,
    phone: lead.phone,
    website: lead.website,
    qualificationScore: qual.score.total,
    qualificationLabel: qual.classification,
    score,
    classification,
    commercial,
    buyingSignals,
    insights,
    risks,
    nextBestActions,
    outreachReadiness,
    channel,
    pipelineRecommendation,
    timeline: buildTimeline(lead, qual),
    matrixQuadrant: matrixQuadrant(
      commercial.conversionProbability,
      score.total,
    ),
    lastActivityAt: lead.updated_at,
    needsReview:
      incomplete ||
      outreachReadiness.status === "needs_enrichment" ||
      risks.some((risk) => risk.severity === "high"),
    hasEmail: hasText(lead.email),
    hasPhone: hasText(lead.phone),
  };
}

export function buildOpportunityRecords(
  leads: CrmLeadWithRelations[],
): OpportunityRecord[] {
  return leads
    .map((lead) => buildOpportunityRecord(lead))
    .sort((a, b) => b.score.total - a.score.total);
}

export function buildOpportunityOverview(
  records: OpportunityRecord[],
): OpportunityOverviewKpi[] {
  const total = records.length;
  const highValue = records.filter((r) => r.score.total >= 75).length;
  const urgent = records.filter(
    (r) =>
      r.commercial.salesUrgency === "immediate" ||
      r.commercial.salesUrgency === "high",
  ).length;
  const campaignReady = records.filter(
    (r) => r.outreachReadiness.status === "ready",
  ).length;
  const avgScore =
    total === 0
      ? 0
      : clamp(records.reduce((s, r) => s + r.score.total, 0) / total);
  const avgConv =
    total === 0
      ? 0
      : clamp(
          records.reduce((s, r) => s + r.commercial.conversionProbability, 0) /
            total,
        );
  const pipelinePotential = records.reduce(
    (s, r) => s + r.commercial.expectedValue,
    0,
  );
  const needsReview = records.filter((r) => r.needsReview).length;

  return [
    {
      key: "total",
      label: "Total Opportunities",
      value: String(total),
      explanation: "Alle geanalyseerde leads",
      tooltip: "Aantal opportunity records uit huidige CRM leads.",
      trendLabel: "stable",
      trendDirection: "flat",
    },
    {
      key: "high_value",
      label: "High-Value Opportunities",
      value: String(highValue),
      explanation: "Score ≥ 75",
      tooltip: "Opportunity score van 75 of hoger.",
      trendLabel: highValue > total / 3 ? "up" : "flat",
      trendDirection: highValue > total / 3 ? "up" : "flat",
    },
    {
      key: "urgent",
      label: "Urgent Opportunities",
      value: String(urgent),
      explanation: "Immediate / High urgency",
      tooltip: "Sales urgency immediate of high.",
      trendLabel: urgent > 0 ? "up" : "flat",
      trendDirection: urgent > 0 ? "up" : "flat",
    },
    {
      key: "campaign",
      label: "Campaign-Ready Leads",
      value: String(campaignReady),
      explanation: "Outreach readiness = Ready",
      tooltip: "Technisch klaar voor outreach (geen legal approval).",
      trendLabel: "flat",
      trendDirection: "flat",
    },
    {
      key: "avg_score",
      label: "Average Opportunity Score",
      value: String(avgScore),
      explanation: "Gemiddelde 0–100",
      tooltip: "Gemiddelde gewogen opportunity score.",
      trendLabel: avgScore >= 60 ? "up" : "down",
      trendDirection: avgScore >= 60 ? "up" : "down",
    },
    {
      key: "avg_conv",
      label: "Average Conversion Probability",
      value: `${avgConv}%`,
      explanation: "Gemiddelde conversiekans",
      tooltip: "Gemiddelde geschatte conversion probability.",
      trendLabel: "flat",
      trendDirection: "flat",
    },
    {
      key: "pipeline",
      label: "Estimated Pipeline Potential",
      value: new Intl.NumberFormat("nl-NL", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      }).format(pipelinePotential),
      explanation: "Som expected values",
      tooltip: "Som van Estimated Deal Value × Conversion Probability.",
      trendLabel: pipelinePotential > 0 ? "up" : "flat",
      trendDirection: pipelinePotential > 0 ? "up" : "flat",
    },
    {
      key: "review",
      label: "Opportunities Requiring Review",
      value: String(needsReview),
      explanation: "Needs enrichment / risks",
      tooltip: "Onvoldoende data, enrichment nodig of high risks.",
      trendLabel: needsReview > total / 2 ? "down" : "flat",
      trendDirection: needsReview > total / 2 ? "down" : "flat",
    },
  ];
}

export function buildExecutiveInsights(
  records: OpportunityRecord[],
): OpportunityExecutiveInsights {
  if (records.length === 0) {
    return {
      highestPotential: null,
      mostUrgent: null,
      bestCampaignCandidate: null,
      highestExpectedValue: null,
      strongestBuyingSignals: null,
      mostCompleteProfile: null,
      needingEnrichment: null,
      atRisk: null,
    };
  }

  const byScore = [...records].sort((a, b) => b.score.total - a.score.total);
  const byUrgency = [...records].sort((a, b) => {
    const rank = (u: SalesUrgency) =>
      ({ immediate: 4, high: 3, medium: 2, low: 1, none: 0 })[u];
    return (
      rank(b.commercial.salesUrgency) - rank(a.commercial.salesUrgency) ||
      b.score.total - a.score.total
    );
  });
  const byCampaign = [...records]
    .filter((r) => r.outreachReadiness.status === "ready" || r.hasEmail)
    .sort((a, b) => b.outreachReadiness.score - a.outreachReadiness.score);
  const byEv = [...records].sort(
    (a, b) => b.commercial.expectedValue - a.commercial.expectedValue,
  );
  const bySignals = [...records].sort(
    (a, b) => b.buyingSignals.length - a.buyingSignals.length,
  );
  const byComplete = [...records].sort(
    (a, b) =>
      b.outreachReadiness.checklist.filter((i) => i.complete).length -
      a.outreachReadiness.checklist.filter((i) => i.complete).length,
  );
  const needingEnrichment =
    records.find((r) => r.outreachReadiness.status === "needs_enrichment") ??
    byComplete[byComplete.length - 1] ??
    null;
  const atRisk =
    records.find((r) => r.risks.some((risk) => risk.severity === "high")) ??
    records.find((r) => r.classification === "low_potential") ??
    null;

  return {
    highestPotential: byScore[0] ?? null,
    mostUrgent: byUrgency[0] ?? null,
    bestCampaignCandidate: byCampaign[0] ?? byScore[0] ?? null,
    highestExpectedValue: byEv[0] ?? null,
    strongestBuyingSignals: bySignals[0] ?? null,
    mostCompleteProfile: byComplete[0] ?? null,
    needingEnrichment,
    atRisk,
  };
}

export function classificationLabel(
  value: OpportunityClassification,
): string {
  switch (value) {
    case "strategic":
      return "Strategic";
    case "high_potential":
      return "High Potential";
    case "promising":
      return "Promising";
    case "nurture":
      return "Nurture";
    case "low_potential":
      return "Low Potential";
    case "insufficient_data":
      return "Insufficient Data";
  }
}

export function channelLabel(value: RecommendedChannel): string {
  switch (value) {
    case "email":
      return "Email";
    case "phone":
      return "Phone";
    case "linkedin":
      return "LinkedIn";
    case "website_form":
      return "Website Contact Form";
    case "manual_research":
      return "Manual Research";
    case "no_outreach":
      return "No Outreach";
  }
}

export function readinessLabel(value: OutreachReadiness["status"]): string {
  switch (value) {
    case "ready":
      return "Ready";
    case "almost_ready":
      return "Almost Ready";
    case "needs_enrichment":
      return "Needs Enrichment";
    case "blocked":
      return "Blocked";
    case "excluded":
      return "Excluded";
  }
}

export function stageLabel(value: SuggestedPipelineStage): string {
  switch (value) {
    case "new":
      return "New";
    case "qualified":
      return "Qualified";
    case "contact_planned":
      return "Contact Planned";
    case "contacted":
      return "Contacted";
    case "engaged":
      return "Engaged";
    case "proposal":
      return "Proposal";
    case "nurture":
      return "Nurture";
    case "closed":
      return "Closed";
    case "archive":
      return "Archive";
  }
}

export function quadrantLabel(
  value: OpportunityRecord["matrixQuadrant"],
): string {
  switch (value) {
    case "prioritize_now":
      return "Prioritize Now";
    case "strategic_nurture":
      return "Strategic Nurture";
    case "quick_wins":
      return "Quick Wins";
    case "low_priority":
      return "Low Priority";
  }
}
