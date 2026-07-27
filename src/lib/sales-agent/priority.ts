/**
 * Priority + risk + next-best-action engines for deals.
 */

import type {
  NextBestAction,
  RiskLevel,
} from "@/lib/sales-agent/constants";
import type { DealSignalInput } from "@/lib/sales-agent/types";

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function daysBetween(fromIso: string | null | undefined, to = Date.now()) {
  if (!fromIso) return null;
  const t = new Date(fromIso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((to - t) / (24 * 60 * 60 * 1000));
}

export function computeRiskScore(deal: DealSignalInput): {
  riskScore: number;
  riskLevel: RiskLevel;
  reasons: string[];
} {
  let score = 10;
  const reasons: string[] = [];

  const stale = deal.daysSinceLastActivity;
  if (stale != null && stale >= 18) {
    score += 35;
    reasons.push(`Geen contact sinds ${stale} dagen`);
  } else if (stale != null && stale >= 10) {
    score += 20;
    reasons.push(`Deal stil sinds ${stale} dagen`);
  }

  if (deal.overdueTasks > 0) {
    score += Math.min(20, deal.overdueTasks * 8);
    reasons.push(`${deal.overdueTasks} overdue task(s)`);
  }

  if (deal.expectedCloseDate) {
    const daysToClose = daysBetween(deal.expectedCloseDate);
    if (daysToClose != null && daysToClose < 0) {
      score += 25;
      reasons.push("Closing date verlopen");
    } else if (daysToClose != null && daysToClose <= 3 && deal.openTasks > 0) {
      score += 12;
      reasons.push("Deadline nabij met open taken");
    }
  }

  if (deal.competitor?.trim()) {
    score += 15;
    reasons.push("Concurrent genoemd");
  }

  if ((deal.probability ?? 50) < 30 && deal.value >= 5000) {
    score += 10;
    reasons.push("Lage kans bij hoge waarde");
  }

  if (deal.noteCount === 0 && daysBetween(deal.createdAt) != null && (daysBetween(deal.createdAt) ?? 0) > 7) {
    score += 8;
    reasons.push("Geen notities na een week");
  }

  const riskScore = clamp(score);
  const riskLevel: RiskLevel =
    riskScore >= 80
      ? "critical"
      : riskScore >= 60
        ? "high"
        : riskScore >= 35
          ? "medium"
          : "low";

  return { riskScore, riskLevel, reasons };
}

export function computePriorityScore(deal: DealSignalInput, riskScore: number): number {
  let score = 15;

  // Deal value (business impact)
  if (deal.value >= 50000) score += 25;
  else if (deal.value >= 15000) score += 18;
  else if (deal.value >= 5000) score += 12;
  else if (deal.value > 0) score += 6;

  // Closing date urgency
  if (deal.expectedCloseDate) {
    const days = daysBetween(deal.expectedCloseDate);
    if (days != null && days < 0) score += 20;
    else if (days != null && days <= 7) score += 18;
    else if (days != null && days <= 30) score += 10;
  }

  // Lead score
  const lead = deal.leadAiScore ?? 0;
  score += Math.round(lead * 0.15);

  // Activity / tasks
  if (deal.openTasks > 0) score += Math.min(12, deal.openTasks * 4);
  if (deal.overdueTasks > 0) score += 10;

  // Stale contact pushes priority for follow-up
  if (deal.daysSinceLastActivity != null && deal.daysSinceLastActivity >= 7) {
    score += 12;
  }

  // Risk contributes to priority (act now)
  score += Math.round(riskScore * 0.2);

  return clamp(score);
}

export function computeClosingProbability(deal: DealSignalInput, riskScore: number): number {
  const base =
    deal.probability != null
      ? deal.probability / 100
      : deal.stageSortOrder != null
        ? Math.min(0.85, 0.15 + deal.stageSortOrder * 0.12)
        : 0.35;

  const leadBoost = ((deal.leadAiScore ?? 40) / 100) * 0.15;
  const riskPenalty = (riskScore / 100) * 0.35;
  const activityBoost =
    deal.daysSinceLastActivity != null && deal.daysSinceLastActivity <= 3
      ? 0.08
      : 0;

  const p = Math.max(0.02, Math.min(0.95, base + leadBoost + activityBoost - riskPenalty));
  return Math.round(p * 100) / 100;
}

export function chooseNextBestAction(
  deal: DealSignalInput,
  riskLevel: RiskLevel,
): NextBestAction {
  const stale = deal.daysSinceLastActivity ?? 0;
  const daysToClose = deal.expectedCloseDate
    ? daysBetween(deal.expectedCloseDate)
    : null;

  if (riskLevel === "critical" || (daysToClose != null && daysToClose < 0)) {
    return "call";
  }
  if (deal.overdueTasks > 0) return "follow_up";
  if (stale >= 14) return "call";
  if (stale >= 7) return "send_reminder";
  if ((deal.probability ?? 40) >= 60 && deal.value >= 5000) return "send_quote";
  if ((deal.probability ?? 40) >= 40 && stale <= 5) return "plan_demo";
  if (deal.openTasks === 0 && stale >= 3) return "book_meeting";
  if (riskLevel === "high") return "send_email";
  if ((deal.probability ?? 0) < 20 && stale >= 10) return "ask_feedback";
  return "wait";
}

export function predictCloseDate(
  deal: DealSignalInput,
  closingProbability: number,
): string | null {
  if (deal.expectedCloseDate) return deal.expectedCloseDate.slice(0, 10);
  const daysOut = Math.round(45 - closingProbability * 30);
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + Math.max(7, daysOut));
  return d.toISOString().slice(0, 10);
}
