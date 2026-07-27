/**
 * Pipeline health + revenue forecast engines.
 */

import type {
  DealSignalInput,
  ForecastResult,
  PipelineHealthResult,
} from "@/lib/sales-agent/types";
import { computeClosingProbability, computeRiskScore } from "@/lib/sales-agent/priority";

function daysBetween(a: string, b: string) {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

export function analyzePipelineHealth(
  deals: DealSignalInput[],
): PipelineHealthResult {
  const open = deals.filter((d) => d.status === "open");
  const won = deals.filter((d) => d.status === "won");
  const lost = deals.filter((d) => d.status === "lost");
  const closed = won.length + lost.length;
  const winRate = closed === 0 ? 0 : won.length / closed;

  const cycleDays = won
    .map((d) => daysBetween(d.createdAt, d.updatedAt))
    .filter((n) => n > 0);
  const avgCycleDays =
    cycleDays.length === 0
      ? 0
      : Math.round(cycleDays.reduce((a, b) => a + b, 0) / cycleDays.length);

  let pipelineRevenue = 0;
  let weightedRevenue = 0;
  const bottlenecks: string[] = [];
  const conversionNotes: string[] = [];

  for (const deal of open) {
    pipelineRevenue += deal.value;
    const risk = computeRiskScore(deal);
    const p = computeClosingProbability(deal, risk.riskScore);
    weightedRevenue += deal.value * p;
  }

  const staleOpen = open.filter(
    (d) => (d.daysSinceLastActivity ?? 0) >= 14,
  ).length;
  if (staleOpen >= 3) {
    bottlenecks.push(`${staleOpen} open deals zonder recent contact (≥14d)`);
  }

  const overdue = open.filter((d) => d.overdueTasks > 0).length;
  if (overdue >= 2) {
    bottlenecks.push(`${overdue} deals met overdue tasks`);
  }

  if (winRate > 0 && winRate < 0.25 && closed >= 5) {
    conversionNotes.push(`Lage winratio (${Math.round(winRate * 100)}%)`);
  }
  if (lost.length > won.length && closed >= 4) {
    conversionNotes.push("Meer verlies dan wins in recente set — review lost reasons");
  }

  const healthScore = Math.max(
    5,
    Math.min(
      100,
      Math.round(
        40 +
          winRate * 35 +
          (open.length > 0 ? 15 : 0) -
          staleOpen * 4 -
          overdue * 3,
      ),
    ),
  );

  return {
    healthScore,
    openDeals: open.length,
    wonDeals: won.length,
    lostDeals: lost.length,
    winRate: Math.round(winRate * 100) / 100,
    avgCycleDays,
    pipelineRevenue: Math.round(pipelineRevenue * 100) / 100,
    weightedRevenue: Math.round(weightedRevenue * 100) / 100,
    bottlenecks,
    conversionNotes,
  };
}

export function computeForecast(
  deals: DealSignalInput[],
  sensitivity = 0.55,
  monthlyTarget?: number | null,
): ForecastResult {
  const open = deals.filter((d) => d.status === "open");
  let pipelineRevenue = 0;
  let weighted = 0;

  const now = new Date();
  const month = now.getUTCMonth();
  const year = now.getUTCFullYear();

  for (const deal of open) {
    pipelineRevenue += deal.value;
    const risk = computeRiskScore(deal);
    let p = computeClosingProbability(deal, risk.riskScore);
    // sensitivity shifts conservative ↔ aggressive
    p = Math.max(0.02, Math.min(0.95, p * (0.7 + sensitivity * 0.6)));
    weighted += deal.value * p;
  }

  const monthClose = open
    .filter((d) => {
      if (!d.expectedCloseDate) return true;
      const dt = new Date(d.expectedCloseDate);
      return dt.getUTCMonth() === month && dt.getUTCFullYear() === year;
    })
    .reduce((sum, d) => {
      const risk = computeRiskScore(d);
      const p = computeClosingProbability(d, risk.riskScore);
      return sum + d.value * p * (0.7 + sensitivity * 0.6);
    }, 0);

  const quarter = weighted * 0.85;
  const yearForecast = weighted * 2.8;

  const confidence = Math.max(
    0.25,
    Math.min(0.9, 0.35 + Math.min(0.4, open.length * 0.03) + sensitivity * 0.15),
  );

  let targetHitProbability: number | null = null;
  if (monthlyTarget != null && monthlyTarget > 0) {
    targetHitProbability = Math.max(
      0.02,
      Math.min(0.98, monthClose / monthlyTarget),
    );
  }

  return {
    month: Math.round(monthClose * 100) / 100,
    quarter: Math.round(quarter * 100) / 100,
    year: Math.round(yearForecast * 100) / 100,
    pipelineRevenue: Math.round(pipelineRevenue * 100) / 100,
    weightedRevenue: Math.round(weighted * 100) / 100,
    confidence: Math.round(confidence * 100) / 100,
    targetHitProbability:
      targetHitProbability == null
        ? null
        : Math.round(targetHitProbability * 100) / 100,
  };
}
