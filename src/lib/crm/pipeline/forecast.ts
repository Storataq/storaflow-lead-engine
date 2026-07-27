/**
 * Revenue forecast + pipeline analytics from deals + stage probabilities.
 */

import {
  effectiveDealProbability,
  weightedRevenue,
} from "@/lib/crm/pipeline/constants";

export type DealForecastRow = {
  id: string;
  value: number;
  currency: string;
  status: string;
  probability: number | null;
  stageProbability: number | null;
  expectedCloseDate: string | null;
  closedAt: string | null;
  lostReason: string | null;
  wonReason: string | null;
  stageId: string;
  stageName: string;
  stageColor: string;
  createdAt: string;
  lastStageChangedAt: string | null;
};

export type PipelineForecast = {
  pipelineValue: number;
  expectedRevenue: number;
  weightedRevenue: number;
  monthlyForecast: number;
  quarterForecast: number;
  annualForecast: number;
  openDeals: number;
  wonDeals: number;
  lostDeals: number;
  winRate: number;
  lossRate: number;
  averageDealSize: number;
  averageSalesCycleDays: number | null;
  dealsPerStage: Array<{
    stageId: string;
    stageName: string;
    color: string;
    count: number;
    value: number;
  }>;
  lostReasonBreakdown: Array<{ reason: string; count: number }>;
  wonReasonBreakdown: Array<{ reason: string; count: number }>;
};

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function startOfQuarter(d = new Date()) {
  const q = Math.floor(d.getMonth() / 3) * 3;
  return new Date(d.getFullYear(), q, 1);
}

function endOfQuarter(d = new Date()) {
  const q = Math.floor(d.getMonth() / 3) * 3;
  return new Date(d.getFullYear(), q + 3, 0, 23, 59, 59, 999);
}

function startOfYear(d = new Date()) {
  return new Date(d.getFullYear(), 0, 1);
}

function endOfYear(d = new Date()) {
  return new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999);
}

function inRange(iso: string | null, start: Date, end: Date): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t <= end.getTime();
}

function countReasons(
  rows: DealForecastRow[],
  kind: "won" | "lost",
): Array<{ reason: string; count: number }> {
  const map = new Map<string, number>();
  for (const row of rows) {
    if (kind === "won" && row.status === "won") {
      const key = row.wonReason?.trim() || "Unspecified";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    if (kind === "lost" && row.status === "lost") {
      const key = row.lostReason?.trim() || "Unspecified";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
  }
  return [...map.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);
}

export function buildPipelineForecast(
  deals: DealForecastRow[],
): PipelineForecast {
  const open = deals.filter((d) => d.status === "open");
  const won = deals.filter((d) => d.status === "won");
  const lost = deals.filter((d) => d.status === "lost");
  const closed = [...won, ...lost];

  const pipelineValue = open.reduce((s, d) => s + Number(d.value || 0), 0);
  const weighted = open.reduce((s, d) => {
    const p = effectiveDealProbability(d.probability, d.stageProbability);
    return s + weightedRevenue(d.value, p);
  }, 0);

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const qStart = startOfQuarter(now);
  const qEnd = endOfQuarter(now);
  const yStart = startOfYear(now);
  const yEnd = endOfYear(now);

  const forecastInWindow = (start: Date, end: Date) =>
    open.reduce((s, d) => {
      const close = d.expectedCloseDate;
      if (!close || !inRange(close, start, end)) return s;
      const p = effectiveDealProbability(d.probability, d.stageProbability);
      return s + weightedRevenue(d.value, p);
    }, 0);

  const monthlyForecast = forecastInWindow(monthStart, monthEnd);
  const quarterForecast = forecastInWindow(qStart, qEnd);
  const annualForecast = forecastInWindow(yStart, yEnd);

  // Fallback: if no close dates, approximate from weighted open pipeline
  const expectedRevenue =
    monthlyForecast + quarterForecast + annualForecast > 0
      ? weighted
      : weighted;

  const winRate =
    closed.length === 0 ? 0 : Math.round((won.length / closed.length) * 100);
  const lossRate =
    closed.length === 0 ? 0 : Math.round((lost.length / closed.length) * 100);

  const averageDealSize =
    open.length === 0
      ? 0
      : open.reduce((s, d) => s + Number(d.value || 0), 0) / open.length;

  const cycles = won
    .map((d) => {
      const end = d.closedAt ? new Date(d.closedAt).getTime() : null;
      const start = new Date(d.createdAt).getTime();
      if (!end) return null;
      return Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
    })
    .filter((n): n is number => n != null);

  const averageSalesCycleDays =
    cycles.length === 0
      ? null
      : Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length);

  const stageMap = new Map<
    string,
    { stageId: string; stageName: string; color: string; count: number; value: number }
  >();
  for (const d of open) {
    const existing = stageMap.get(d.stageId) ?? {
      stageId: d.stageId,
      stageName: d.stageName,
      color: d.stageColor,
      count: 0,
      value: 0,
    };
    existing.count += 1;
    existing.value += Number(d.value || 0);
    stageMap.set(d.stageId, existing);
  }

  return {
    pipelineValue,
    expectedRevenue,
    weightedRevenue: weighted,
    monthlyForecast: monthlyForecast || weighted * 0.25,
    quarterForecast: quarterForecast || weighted * 0.6,
    annualForecast: annualForecast || weighted,
    openDeals: open.length,
    wonDeals: won.length,
    lostDeals: lost.length,
    winRate,
    lossRate,
    averageDealSize,
    averageSalesCycleDays,
    dealsPerStage: [...stageMap.values()],
    lostReasonBreakdown: countReasons(deals, "lost"),
    wonReasonBreakdown: countReasons(deals, "won"),
  };
}
