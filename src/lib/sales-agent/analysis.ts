/**
 * Deal analysis, coaching, opportunities, follow-up signals.
 */

import {
  SALES_OPPORTUNITY_LABELS,
  type SalesOpportunityCode,
} from "@/lib/sales-agent/constants";
import {
  chooseNextBestAction,
  computeClosingProbability,
  computePriorityScore,
  computeRiskScore,
  predictCloseDate,
} from "@/lib/sales-agent/priority";
import type {
  DealAnalysisResult,
  DealSignalInput,
} from "@/lib/sales-agent/types";

export function detectSalesOpportunities(
  deal: DealSignalInput,
): Array<{ code: SalesOpportunityCode; label: string; rationale: string }> {
  const out: Array<{
    code: SalesOpportunityCode;
    label: string;
    rationale: string;
  }> = [];

  if (deal.value >= 10000 && (deal.probability ?? 0) >= 50) {
    out.push({
      code: "upsell",
      label: SALES_OPPORTUNITY_LABELS.upsell,
      rationale: "Hoge dealwaarde met redelijke win-kans",
    });
  }
  if (deal.noteCount >= 3 && deal.openTasks === 0) {
    out.push({
      code: "cross_sell",
      label: SALES_OPPORTUNITY_LABELS.cross_sell,
      rationale: "Actieve relatie zonder open taken — cross-sell check",
    });
  }
  if (deal.status === "won") {
    out.push({
      code: "renewal",
      label: SALES_OPPORTUNITY_LABELS.renewal,
      rationale: "Gewonnen deal — renewal/expansion monitoren",
    });
  }
  if (/vestiging|locatie|filiaal|branch/i.test(deal.title)) {
    out.push({
      code: "extra_location",
      label: SALES_OPPORTUNITY_LABELS.extra_location,
      rationale: "Titel suggereert extra vestiging",
    });
  }
  if (deal.leadAiScore != null && deal.leadAiScore >= 70) {
    out.push({
      code: "new_decision_makers",
      label: SALES_OPPORTUNITY_LABELS.new_decision_makers,
      rationale: "Sterke lead score — map extra beslissers",
    });
  }
  return out.slice(0, 5);
}

export function buildCoachTips(
  deal: DealSignalInput,
  riskReasons: string[],
): string[] {
  const tips: string[] = [];
  const stale = deal.daysSinceLastActivity;

  if (stale != null && stale >= 14) {
    tips.push(
      `Deze deal wacht al ${stale} dagen. Bel vandaag — prioriteit verhogen.`,
    );
  } else if (stale != null && stale >= 7) {
    tips.push(
      `Geen contact sinds ${stale} dagen. Stuur een korte follow-up of bel.`,
    );
  }

  if (deal.leadAiScore != null && deal.leadAiScore >= 70 && stale != null && stale <= 2) {
    tips.push(
      "Sterke lead score en recente activiteit — push naar demo/offerte.",
    );
  }

  if (deal.leadAiScore != null && deal.leadAiScore < 30 && stale != null && stale >= 10) {
    tips.push(
      "Deze prospect reageert nauwelijks. Verlaag prioriteit of vraag feedback.",
    );
  }

  if (deal.competitor?.trim()) {
    tips.push(`Concurrent genoemd (${deal.competitor}). Bereid differentiatie voor.`);
  }

  if (deal.expectedCloseDate) {
    const close = new Date(deal.expectedCloseDate).getTime();
    if (!Number.isNaN(close) && close < Date.now()) {
      tips.push("Closing date is verlopen — herbevestig timeline met de klant.");
    }
  }

  for (const reason of riskReasons.slice(0, 2)) {
    if (!tips.some((t) => t.includes(reason.slice(0, 20)))) {
      tips.push(reason);
    }
  }

  if (tips.length === 0) {
    tips.push("Deal gezond genoeg — houd cadence aan en log iedere touch.");
  }

  return tips.slice(0, 6);
}

export function analyzeDeal(deal: DealSignalInput): DealAnalysisResult {
  const risk = computeRiskScore(deal);
  const priorityScore = computePriorityScore(deal, risk.riskScore);
  const closingProbability = computeClosingProbability(deal, risk.riskScore);
  const nextBestAction = chooseNextBestAction(deal, risk.riskLevel);
  const predictedCloseDate = predictCloseDate(deal, closingProbability);
  const opportunities = detectSalesOpportunities(deal);
  const coachTips = buildCoachTips(deal, risk.reasons);

  const obstacles: string[] = [...risk.reasons];
  if (deal.openTasks === 0 && (deal.daysSinceLastActivity ?? 0) >= 5) {
    obstacles.push("Geen geplande volgende stap");
  }
  if ((deal.probability ?? 100) < 25) {
    obstacles.push("Lage win-kans in CRM");
  }

  const missedActivities: string[] = [];
  if (deal.overdueTasks > 0) {
    missedActivities.push(`${deal.overdueTasks} overdue task(s)`);
  }
  if ((deal.daysSinceLastActivity ?? 0) >= 10) {
    missedActivities.push("Follow-up ontbreekt");
  }
  if (deal.noteCount === 0) {
    missedActivities.push("Geen gespreksnotities");
  }

  const confidence = Math.max(
    0.2,
    Math.min(
      0.95,
      0.35 +
        (deal.probability != null ? 0.2 : 0) +
        (deal.leadAiScore != null ? 0.15 : 0) +
        (deal.daysSinceLastActivity != null ? 0.15 : 0) +
        (deal.noteCount > 0 ? 0.1 : 0),
    ),
  );

  return {
    priorityScore,
    closingProbability,
    expectedRevenue: Math.round(deal.value * closingProbability * 100) / 100,
    riskLevel: risk.riskLevel,
    riskScore: risk.riskScore,
    predictedCloseDate,
    nextBestAction,
    obstacles: obstacles.slice(0, 8),
    missedActivities,
    coachTips,
    opportunities,
    confidence: Math.round(confidence * 100) / 100,
  };
}
