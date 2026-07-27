/**
 * Deterministic contact intelligence scoring and profile inference.
 */

import {
  CONTACT_BADGE_LABELS,
  healthBandFromScore,
  type ContactBadgeCode,
  type PreferredChannel,
} from "@/lib/crm/contact-intelligence/constants";
import type { ContactIntelligenceSignals } from "@/lib/crm/contact-intelligence/signals";
import type {
  CommunicationPreferencesBlock,
  ContactAiSummary,
  ContactBadgeItem,
  ContactHealthBlock,
  ContactProfileBlock,
  ContactQualityBlock,
  DecisionMakerBlock,
  InsightItem,
  RecommendationItem,
  TimelineItem,
} from "@/lib/crm/contact-intelligence/types";

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function titleHay(signals: ContactIntelligenceSignals): string {
  return [signals.jobTitle, signals.fullName].filter(Boolean).join(" ").toLowerCase();
}

export function inferContactProfile(
  signals: ContactIntelligenceSignals,
): ContactProfileBlock {
  const hay = titleHay(signals);

  const technicalRole =
    /\b(cto|engineer|developer|technical|it |devops|architect|tech)\b/.test(hay);
  const commercialRole =
    /\b(sales|account|commercial|business development|bd |marketing|growth)\b/.test(
      hay,
    );
  const financeRole =
    /\b(cfo|finance|controller|boekhoud|accountant|financial)\b/.test(hay);
  const operationsRole =
    /\b(coo|operations|ops|logistics|supply|operations manager)\b/.test(hay);

  let department: string | null = null;
  if (financeRole) department = "Finance";
  else if (technicalRole) department = "Technical";
  else if (operationsRole) department = "Operations";
  else if (/\bmarketing\b/.test(hay)) department = "Marketing";
  else if (commercialRole) department = "Commercial";
  else if (/\bhr|people|recruit\b/.test(hay)) department = "People";
  else if (signals.jobTitle) department = "General";

  let managementLevel: string | null = null;
  if (/\b(ceo|cfo|cto|coo|chief|founder|owner|president)\b/.test(hay)) {
    managementLevel = "C-level";
  } else if (/\b(vp|vice president|director|hoofd)\b/.test(hay)) {
    managementLevel = "Director";
  } else if (/\b(manager|lead|teamlead|supervisor)\b/.test(hay)) {
    managementLevel = "Manager";
  } else if (/\b(senior|sr\.|principal)\b/.test(hay)) {
    managementLevel = "Senior IC";
  } else if (signals.jobTitle) {
    managementLevel = "Individual Contributor";
  }

  let decisionMakerLevel: string | null = null;
  if (managementLevel === "C-level") decisionMakerLevel = "Executive";
  else if (managementLevel === "Director") decisionMakerLevel = "High";
  else if (managementLevel === "Manager") decisionMakerLevel = "Medium";
  else if (managementLevel) decisionMakerLevel = "Influencer";

  let estimatedSeniority: string | null = managementLevel;
  if (/\bjunior|jr\.\b/.test(hay)) estimatedSeniority = "Junior";
  if (/\bfounder|owner\b/.test(hay)) estimatedSeniority = "Founder/Owner";

  let primaryLanguage: string | null = null;
  const country = (signals.leadCountry ?? "").toLowerCase();
  if (["nl", "netherlands", "nederland", "belgium", "belgie", "be"].some((x) =>
    country.includes(x),
  )) {
    primaryLanguage = "nl";
  } else if (["de", "germany", "deutschland", "at", "ch"].some((x) =>
    country.includes(x),
  )) {
    primaryLanguage = "de";
  } else if (country) {
    primaryLanguage = "en";
  }

  let timezone: string | null = null;
  if (primaryLanguage === "nl" || primaryLanguage === "de") {
    timezone = "Europe/Amsterdam";
  } else if (primaryLanguage === "en" && country.includes("uk")) {
    timezone = "Europe/London";
  }

  return {
    jobTitle: signals.jobTitle,
    department,
    managementLevel,
    decisionMakerLevel,
    technicalRole,
    commercialRole,
    financeRole,
    operationsRole,
    estimatedSeniority,
    primaryLanguage,
    country: signals.leadCountry,
    region: signals.leadCity,
    timezone,
  };
}

export function scoreDecisionMaker(
  signals: ContactIntelligenceSignals,
  profile: ContactProfileBlock,
): DecisionMakerBlock {
  const hay = titleHay(signals);
  let buyingInfluence = 20;
  let decisionAuthority = 15;
  let budgetInfluence = 10;
  let technicalInfluence = profile.technicalRole ? 55 : 15;
  let executiveInfluence = 10;

  if (profile.managementLevel === "C-level") {
    buyingInfluence += 45;
    decisionAuthority += 55;
    budgetInfluence += 50;
    executiveInfluence += 60;
  } else if (profile.managementLevel === "Director") {
    buyingInfluence += 35;
    decisionAuthority += 40;
    budgetInfluence += 35;
    executiveInfluence += 35;
  } else if (profile.managementLevel === "Manager") {
    buyingInfluence += 25;
    decisionAuthority += 25;
    budgetInfluence += 20;
    executiveInfluence += 15;
  }

  if (profile.commercialRole || /\bbuyer|procurement|inkoop\b/.test(hay)) {
    buyingInfluence += 20;
    budgetInfluence += 15;
  }
  if (profile.financeRole) budgetInfluence += 25;
  if (signals.isPrimary) {
    buyingInfluence += 10;
    decisionAuthority += 10;
  }

  buyingInfluence = clamp(buyingInfluence);
  decisionAuthority = clamp(decisionAuthority);
  budgetInfluence = clamp(budgetInfluence);
  technicalInfluence = clamp(technicalInfluence);
  executiveInfluence = clamp(executiveInfluence);

  const avg =
    (buyingInfluence +
      decisionAuthority +
      budgetInfluence +
      technicalInfluence +
      executiveInfluence) /
    5;
  const isDecisionMaker = avg >= 45 || decisionAuthority >= 55;

  return {
    buyingInfluence,
    decisionAuthority,
    budgetInfluence,
    technicalInfluence,
    executiveInfluence,
    isDecisionMaker,
    summary: isDecisionMaker
      ? "Likely involved in buying or approval decisions"
      : "Limited decision authority signals from title/role",
  };
}

export function scoreContactHealth(
  signals: ContactIntelligenceSignals,
  profile: ContactProfileBlock,
  decision: DecisionMakerBlock,
): ContactHealthBlock {
  const emailOk = Boolean(signals.email?.includes("@"));
  const phoneOk = Boolean(signals.phone && signals.phone.replace(/\D/g, "").length >= 8);
  const linkedinOk = Boolean(signals.linkedinUrl);
  const completeProfile =
    Boolean(signals.firstName || signals.lastName) &&
    Boolean(signals.jobTitle) &&
    emailOk;

  const recentActivity =
    Boolean(signals.recentActivityAt) ||
    Boolean(signals.recentNoteAt) ||
    Boolean(signals.recentTaskAt);

  const factors: ContactHealthBlock["factors"] = [
    {
      id: "completeness",
      label: "Complete profile",
      score: clamp(
        (signals.firstName || signals.lastName ? 25 : 0) +
          (signals.jobTitle ? 25 : 0) +
          (emailOk ? 25 : 0) +
          (phoneOk ? 15 : 0) +
          (linkedinOk ? 10 : 0),
      ),
      weight: 0.25,
    },
    {
      id: "email",
      label: "Verified email",
      score: emailOk ? 85 : 10,
      weight: 0.2,
    },
    {
      id: "phone",
      label: "Verified phone",
      score: phoneOk ? 80 : 15,
      weight: 0.1,
    },
    {
      id: "linkedin",
      label: "LinkedIn available",
      score: linkedinOk ? 90 : 20,
      weight: 0.1,
    },
    {
      id: "company",
      label: "Company match",
      score: signals.leadCompanyName ? 85 : 30,
      weight: 0.15,
    },
    {
      id: "activity",
      label: "Recent activity",
      score: recentActivity ? 75 : 25,
      weight: 0.1,
    },
    {
      id: "relationship",
      label: "Relationship history",
      score: clamp(
        signals.noteCount * 8 +
          signals.completedTaskCount * 10 +
          signals.activityCount * 5 +
          signals.dealCount * 12,
      ),
      weight: 0.1,
    },
  ];

  // Boost slightly when decision maker with complete profile
  let score = factors.reduce((sum, f) => sum + f.score * f.weight, 0);
  if (decision.isDecisionMaker && completeProfile) score += 5;
  if (profile.managementLevel === "C-level") score += 3;
  score = clamp(score);

  return {
    score,
    band: healthBandFromScore(score),
    factors,
  };
}

export function scoreContactQuality(
  signals: ContactIntelligenceSignals,
  profile: ContactProfileBlock,
  decision: DecisionMakerBlock,
): ContactQualityBlock {
  const explanations: ContactQualityBlock["explanations"] = [];
  let score = 15;

  if (signals.email?.includes("@")) {
    const points = 20;
    score += points;
    explanations.push({
      id: "email",
      label: "Email quality",
      detail: "Business email present",
      points,
    });
  } else {
    explanations.push({
      id: "email",
      label: "Email quality",
      detail: "No email on file",
      points: 0,
    });
  }

  if (signals.phone) {
    const points = 12;
    score += points;
    explanations.push({
      id: "phone",
      label: "Phone quality",
      detail: "Phone number present",
      points,
    });
  } else {
    explanations.push({
      id: "phone",
      label: "Phone quality",
      detail: "No phone on file",
      points: 0,
    });
  }

  if (profile.jobTitle) {
    const points = 15;
    score += points;
    explanations.push({
      id: "role",
      label: "Company role",
      detail: profile.jobTitle,
      points,
    });
  }

  const completenessPoints = clamp(
    (signals.jobTitle ? 8 : 0) +
      (signals.linkedinUrl ? 8 : 0) +
      (signals.isPrimary ? 6 : 0) +
      (profile.department ? 5 : 0),
  );
  score += completenessPoints;
  explanations.push({
    id: "completeness",
    label: "Profile completeness",
    detail: `${completenessPoints} points from title, LinkedIn, primary flag, department`,
    points: completenessPoints,
  });

  const activityPoints = clamp(
    signals.activityCount * 3 + signals.noteCount * 2 + signals.completedTaskCount * 4,
    0,
    15,
  );
  score += activityPoints;
  explanations.push({
    id: "activity",
    label: "Activity",
    detail: `${signals.activityCount} activities, ${signals.noteCount} notes, ${signals.completedTaskCount} completed tasks`,
    points: activityPoints,
  });

  if (decision.isDecisionMaker) {
    score += 18;
    explanations.push({
      id: "dm",
      label: "Decision maker status",
      detail: decision.summary,
      points: 18,
    });
  } else {
    explanations.push({
      id: "dm",
      label: "Decision maker status",
      detail: "Not flagged as decision maker",
      points: 0,
    });
  }

  return { score: clamp(score), explanations };
}

export function estimateCommunication(
  signals: ContactIntelligenceSignals,
  profile: ContactProfileBlock,
): CommunicationPreferencesBlock {
  let preferredChannel: PreferredChannel = "unknown";
  if (signals.email && signals.phone && signals.linkedinUrl) {
    preferredChannel = profile.commercialRole ? "meeting" : "email";
  } else if (signals.email) preferredChannel = "email";
  else if (signals.phone) preferredChannel = "phone";
  else if (signals.linkedinUrl) preferredChannel = "linkedin";

  const frequency =
    signals.activityCount + signals.noteCount >= 5
      ? "Weekly touchpoints OK"
      : signals.email
        ? "Bi-weekly outreach"
        : "Low-frequency nurture";

  const bestTiming =
    profile.timezone === "Europe/Amsterdam"
      ? "Tue–Thu, 09:00–11:30 local"
      : "Business hours on weekdays";

  return {
    preferredChannel,
    frequency,
    bestTiming,
    rationale: `Based on available channels (${[
      signals.email ? "email" : null,
      signals.phone ? "phone" : null,
      signals.linkedinUrl ? "linkedin" : null,
    ]
      .filter(Boolean)
      .join(", ") || "none"}) and role signals`,
  };
}

export function buildTimeline(
  signals: ContactIntelligenceSignals,
): TimelineItem[] {
  const items: TimelineItem[] = [
    {
      id: `created-${signals.contactId}`,
      type: "created",
      label: "Contact created",
      at: signals.createdAt,
    },
  ];

  for (const note of signals.notes) {
    items.push({
      id: `note-${note.id}`,
      type: "note",
      label: "Note added",
      at: note.createdAt,
      detail: note.preview || undefined,
    });
  }

  for (const task of signals.tasks) {
    items.push({
      id: `task-${task.id}`,
      type: task.status === "done" ? "task_completed" : "task",
      label: task.status === "done" ? "Task completed" : "Task created",
      at: task.status === "done" ? task.updatedAt : task.createdAt,
      detail: task.title,
    });
  }

  for (const activity of signals.activities) {
    const type = activity.eventType.toLowerCase();
    let label = activity.description || activity.eventType;
    if (type.includes("email") && type.includes("open")) label = "Email opened";
    else if (type.includes("email") && type.includes("click")) label = "Link clicked";
    else if (type.includes("email") && type.includes("sent")) label = "Email sent";
    else if (type.includes("campaign")) label = activity.description || "Campaign event";
    else if (type.includes("call")) label = "Call";
    else if (type.includes("meeting")) label = "Meeting";
    else if (type.includes("import")) label = "Imported";

    items.push({
      id: `act-${activity.id}`,
      type: activity.eventType,
      label,
      at: activity.createdAt,
      detail: activity.description,
    });
  }

  if (signals.dealCount > 0) {
    items.push({
      id: `deals-${signals.leadId}`,
      type: "deal",
      label: `${signals.dealCount} deal(s) on lead`,
      at: signals.updatedAt,
    });
  }

  return items
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 40);
}

export function buildInsights(
  signals: ContactIntelligenceSignals,
  profile: ContactProfileBlock,
  decision: DecisionMakerBlock,
  health: ContactHealthBlock,
  quality: ContactQualityBlock,
): InsightItem[] {
  const items: InsightItem[] = [];

  if (decision.isDecisionMaker) {
    items.push({
      id: "dm",
      label: "Likely decision maker",
      severity: "positive",
      confidence: clamp(decision.decisionAuthority),
    });
  }
  if (decision.executiveInfluence >= 60) {
    items.push({
      id: "exec",
      label: "Strong business / executive influence",
      severity: "positive",
      confidence: decision.executiveInfluence,
    });
  }
  if (!signals.email) {
    items.push({
      id: "missing-email",
      label: "Missing contact email",
      severity: "warning",
      confidence: 95,
    });
  }
  if (!signals.linkedinUrl) {
    items.push({
      id: "no-linkedin",
      label: "No LinkedIn on file",
      severity: "info",
      confidence: 90,
    });
  }
  if (signals.activityCount + signals.noteCount >= 6) {
    items.push({
      id: "high-eng",
      label: "High engagement on related lead",
      severity: "positive",
      confidence: 70,
    });
  } else if (signals.activityCount + signals.noteCount === 0) {
    items.push({
      id: "low-eng",
      label: "Low engagement so far",
      severity: "info",
      confidence: 75,
    });
  }
  if (quality.score >= 70 && decision.isDecisionMaker) {
    items.push({
      id: "campaign",
      label: "Excellent campaign candidate",
      severity: "positive",
      confidence: 80,
    });
  }
  if (health.band === "needs_attention") {
    items.push({
      id: "health-low",
      label: "Contact health needs attention",
      severity: "warning",
      confidence: 85,
    });
  }
  if (/\b(promoted|nieuw|new role|recently)\b/i.test(signals.jobTitle ?? "")) {
    items.push({
      id: "promoted",
      label: "Possible recent role change",
      severity: "info",
      confidence: 40,
    });
  }
  if (profile.commercialRole) {
    items.push({
      id: "commercial",
      label: "Commercial role — good for sales outreach",
      severity: "positive",
      confidence: 65,
    });
  }

  return items.slice(0, 10);
}

export function buildRecommendations(
  signals: ContactIntelligenceSignals,
  decision: DecisionMakerBlock,
  communication: CommunicationPreferencesBlock,
  quality: ContactQualityBlock,
): RecommendationItem[] {
  const items: RecommendationItem[] = [];

  if (decision.isDecisionMaker && signals.phone) {
    items.push({
      id: "call",
      action: "Call today",
      priority: "high",
      rationale: "Decision maker with phone available",
    });
  }
  if (signals.email) {
    items.push({
      id: "intro",
      action: "Send introduction email",
      priority: decision.isDecisionMaker ? "high" : "medium",
      rationale: "Email channel available for first touch",
    });
  }
  if (communication.preferredChannel === "meeting" || quality.score >= 75) {
    items.push({
      id: "meeting",
      action: "Schedule meeting",
      priority: "medium",
      rationale: "Profile strength supports a live conversation",
    });
  }
  if (!decision.isDecisionMaker && quality.score < 50) {
    items.push({
      id: "wait",
      action: "Wait one week",
      priority: "low",
      rationale: "Enrich profile before heavy outreach",
    });
  }
  if (!signals.linkedinUrl) {
    items.push({
      id: "linkedin",
      action: "Research LinkedIn",
      priority: "medium",
      rationale: "No LinkedIn URL — verify role and seniority",
    });
  }
  if (!signals.leadOwnerId) {
    items.push({
      id: "owner",
      action: "Assign sales owner",
      priority: "medium",
      rationale: "Lead has no owner yet",
    });
  }
  if (decision.isDecisionMaker && quality.score >= 65) {
    items.push({
      id: "hot",
      action: "Move to Hot Leads",
      priority: "high",
      rationale: "Decision maker with strong contact quality",
    });
  }

  return items.slice(0, 8);
}

export function buildBadges(
  signals: ContactIntelligenceSignals,
  profile: ContactProfileBlock,
  decision: DecisionMakerBlock,
  quality: ContactQualityBlock,
): ContactBadgeItem[] {
  const codes = new Set<ContactBadgeCode>();
  const hay = titleHay(signals);

  if (/\bceo\b/.test(hay)) codes.add("ceo");
  if (/\bfounder\b/.test(hay)) codes.add("founder");
  if (/\bowner|eigenaar\b/.test(hay)) codes.add("owner");
  if (/\bdirector|directeur\b/.test(hay)) codes.add("director");
  if (/\bmanager\b/.test(hay)) codes.add("manager");
  if (/\bbuyer|procurement|inkoop\b/.test(hay)) codes.add("buyer");
  if (profile.department === "Marketing" || /\bmarketing\b/.test(hay)) {
    codes.add("marketing");
  }
  if (profile.financeRole) codes.add("finance");
  if (profile.operationsRole) codes.add("operations");
  if (profile.technicalRole) codes.add("technical");
  if (profile.commercialRole) codes.add("commercial");
  if (decision.isDecisionMaker) codes.add("decision_maker");
  if (quality.score >= 75 && decision.isDecisionMaker) codes.add("hot_lead");
  if (signals.isPrimary && decision.executiveInfluence >= 60) codes.add("vip");

  return [...codes].map((code) => ({
    code,
    label: CONTACT_BADGE_LABELS[code],
  }));
}

export function buildDeterministicSummary(
  signals: ContactIntelligenceSignals,
  profile: ContactProfileBlock,
  decision: DecisionMakerBlock,
  quality: ContactQualityBlock,
): ContactAiSummary {
  const who = `${signals.fullName}${
    signals.leadCompanyName ? ` at ${signals.leadCompanyName}` : ""
  }`;
  const currentRole = profile.jobTitle ?? "Role not specified";
  const responsibilities = [
    profile.department ? `${profile.department} focus` : null,
    profile.technicalRole ? "Technical responsibilities" : null,
    profile.commercialRole ? "Commercial responsibilities" : null,
    profile.financeRole ? "Finance responsibilities" : null,
    profile.operationsRole ? "Operations responsibilities" : null,
  ]
    .filter(Boolean)
    .join("; ") || "Responsibilities not yet inferred";

  const interests: string[] = [];
  if (profile.commercialRole) interests.push("Growth / revenue topics");
  if (profile.technicalRole) interests.push("Product / technical fit");
  if (decision.isDecisionMaker) interests.push("Vendor evaluation");
  if (signals.leadIndustry) interests.push(signals.leadIndustry);

  const confidence = clamp(
    (signals.jobTitle ? 30 : 10) +
      (signals.email ? 20 : 0) +
      (signals.linkedinUrl ? 15 : 0) +
      (profile.department ? 15 : 0) +
      (signals.noteCount + signals.activityCount > 0 ? 15 : 0) +
      (decision.isDecisionMaker ? 10 : 0),
  );

  return {
    who,
    currentRole,
    responsibilities,
    decisionMakingInfluence: decision.summary,
    possibleInterests: interests.length
      ? interests
      : ["Insufficient signals for interests"],
    communicationStyle:
      signals.email && !signals.phone
        ? "Likely prefers written / email-first contact"
        : signals.phone && decision.isDecisionMaker
          ? "Open to direct phone outreach"
          : "Communication style still uncertain",
    potentialValue:
      quality.score >= 70
        ? "High — strong profile for outreach and campaigns"
        : quality.score >= 45
          ? "Medium — useful after light enrichment"
          : "Low until contact data improves",
    confidence,
  };
}
