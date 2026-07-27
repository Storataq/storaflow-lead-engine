/**
 * Pipeline + multi-horizon forecast engines.
 */

import type { ForecastHorizon } from "@/lib/revenue-intelligence/constants";
import type {
  HorizonForecast,
  PipelineForecast,
  RevenueDealSignal,
  RevenueKpiBundle,
} from "@/lib/revenue-intelligence/types";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export function analyzePipeline(deals: RevenueDealSignal[]): PipelineForecast {
  const open = deals.filter((d) => d.status === "open");
  const lost = deals.filter((d) => d.status === "lost");
  const openPipeline = open.reduce((s, d) => s + d.value, 0);
  let weighted = 0;
  let likely = 0;
  let risk = 0;
  let expectedClosings = 0;

  const now = Date.now();
  for (const d of open) {
    const p = clamp01((d.probability ?? 40) / 100);
    weighted += d.value * p;
    if (p >= 0.55) {
      likely += d.value * p;
      expectedClosings += 1;
    } else {
      risk += d.value * (1 - p);
    }
    if (d.expectedCloseDate) {
      const days =
        (new Date(d.expectedCloseDate).getTime() - now) / (24 * 60 * 60 * 1000);
      if (days < 0) risk += d.value * 0.25;
    }
  }

  const missedRevenue = lost.reduce((s, d) => s + d.value, 0);

  return {
    openPipeline: round2(openPipeline),
    weightedPipeline: round2(weighted),
    likelyRevenue: round2(likely),
    riskRevenue: round2(risk),
    missedRevenue: round2(missedRevenue),
    expectedClosings,
  };
}

const HORIZON_FACTORS: Record<ForecastHorizon, number> = {
  week: 1 / 4.3,
  month: 1,
  quarter: 3,
  year: 12,
  three_year: 36,
  five_year: 60,
};

export function computeHorizonForecasts(
  kpis: RevenueKpiBundle,
  pipeline: PipelineForecast,
): HorizonForecast[] {
  const growth = Math.max(-0.2, Math.min(0.4, kpis.growthRate || 0.08));

  return (Object.keys(HORIZON_FACTORS) as ForecastHorizon[]).map((horizon) => {
    const months = HORIZON_FACTORS[horizon];
    const recurring = kpis.mrr * months * (1 + growth * Math.min(1, months / 12));
    const pipelineShare =
      horizon === "week"
        ? pipeline.likelyRevenue * 0.15
        : horizon === "month"
          ? pipeline.likelyRevenue * 0.45
          : horizon === "quarter"
            ? pipeline.weightedPipeline * 0.7
            : pipeline.weightedPipeline * Math.min(1.2, months / 6);

    const forecastRevenue = round2(recurring + pipelineShare);
    const confidence = clamp01(
      kpis.confidence * 0.7 +
        (pipeline.openPipeline > 0 ? 0.15 : 0) +
        (horizon === "week" || horizon === "month"
          ? 0.15
          : horizon === "quarter"
            ? 0.08
            : 0.02),
    );

    return {
      horizon,
      forecastRevenue,
      confidence: round2(confidence),
      pipeline,
    };
  });
}
