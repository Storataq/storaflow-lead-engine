/**
 * Deterministic AI subject line scoring (optional AI enrichment later).
 */

import type { SubjectScoreBreakdown } from "@/lib/email/campaign-builder/types";

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function scoreSubjectLine(subject: string): SubjectScoreBreakdown {
  const text = subject.trim();
  const length = text.length;
  const words = text.split(/\s+/).filter(Boolean);
  const lower = text.toLowerCase();

  const rationale: string[] = [];

  let openRate = 45;
  if (length >= 30 && length <= 55) {
    openRate += 20;
    rationale.push("Optimal subject length (30–55 chars)");
  } else if (length < 20) {
    openRate -= 10;
    rationale.push("Subject may be too short");
  } else if (length > 70) {
    openRate -= 15;
    rationale.push("Subject may truncate in inboxes");
  }

  if (/{{/.test(text)) {
    openRate += 12;
    rationale.push("Includes personalization tokens");
  }

  let spamRisk = 15;
  if (/\b(free|!!!|act now|limited time|guaranteed|winner|cash)\b/i.test(text)) {
    spamRisk += 40;
    rationale.push("Contains high spam-risk phrases");
  }
  if ((text.match(/!/g) ?? []).length >= 2) {
    spamRisk += 15;
    rationale.push("Multiple exclamation marks");
  }
  if (text === text.toUpperCase() && length > 5) {
    spamRisk += 25;
    rationale.push("All-caps subject looks promotional");
  }

  let professionalTone = 70;
  if (/\b(hi|hey|quick|q:)\b/i.test(lower)) {
    professionalTone -= 10;
    rationale.push("Casual opener — fine for some B2B, less for formal");
  }
  if (/\b(partnership|proposal|introduction|follow.?up)\b/i.test(lower)) {
    professionalTone += 15;
    rationale.push("Professional business phrasing");
  }

  let urgency = 20;
  if (/\b(today|asap|urgent|deadline|this week)\b/i.test(lower)) {
    urgency += 40;
    rationale.push("Urgency cues detected");
  }
  if (/\?$/.test(text)) {
    urgency += 10;
    openRate += 5;
    rationale.push("Question format can lift curiosity");
  }

  let personalization = /{{/.test(text) ? 75 : 25;
  if (/\byou\b|\byour\b/i.test(lower)) {
    personalization += 10;
  }
  if (words.length >= 4 && words.length <= 9) {
    openRate += 5;
  }

  openRate = clamp(openRate - spamRisk * 0.15);
  spamRisk = clamp(spamRisk);
  professionalTone = clamp(professionalTone);
  urgency = clamp(urgency);
  personalization = clamp(personalization);

  const overall = clamp(
    openRate * 0.35 +
      (100 - spamRisk) * 0.25 +
      professionalTone * 0.2 +
      personalization * 0.15 +
      urgency * 0.05,
  );

  if (rationale.length === 0) {
    rationale.push("Neutral subject — room to personalize");
  }

  return {
    openRate,
    spamRisk,
    professionalTone,
    urgency,
    personalization,
    overall,
    rationale: rationale.slice(0, 6),
  };
}

export function suggestSubjectLines(input: {
  company?: string;
  purpose?: string;
  offer?: string;
  firstNameToken?: boolean;
}): string[] {
  const company = input.company?.trim() || "your team";
  const purpose = input.purpose?.trim() || "a quick idea";
  const offer = input.offer?.trim() || "a short intro";
  const name = input.firstNameToken === false ? "" : "{{first_name}}";

  return [
    name
      ? `${name}, quick thought for ${company}`
      : `Quick thought for ${company}`,
    `Idea on ${purpose} for ${company}`,
    `Following up on ${offer}`,
    name ? `${name} — worth 5 minutes this week?` : `Worth 5 minutes this week?`,
    `Helping ${company} with ${purpose}`,
    `Open question about ${purpose}`,
  ].slice(0, 6);
}
