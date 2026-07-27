/**
 * Customer health score engine.
 */

import type { HealthClass } from "@/lib/customer-success/constants";
import type {
  CustomerSignalInput,
  HealthResult,
  HealthWeights,
} from "@/lib/customer-success/types";

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

export const DEFAULT_HEALTH_WEIGHTS: HealthWeights = {
  activity: 20,
  adoption: 15,
  support: 15,
  nps: 10,
  revenue: 15,
  contract: 10,
  payment: 10,
  tasks: 5,
};

export function parseHealthWeights(raw: unknown): HealthWeights {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_HEALTH_WEIGHTS };
  }
  const o = raw as Record<string, unknown>;
  return {
    activity: Number(o.activity ?? DEFAULT_HEALTH_WEIGHTS.activity),
    adoption: Number(o.adoption ?? DEFAULT_HEALTH_WEIGHTS.adoption),
    support: Number(o.support ?? DEFAULT_HEALTH_WEIGHTS.support),
    nps: Number(o.nps ?? DEFAULT_HEALTH_WEIGHTS.nps),
    revenue: Number(o.revenue ?? DEFAULT_HEALTH_WEIGHTS.revenue),
    contract: Number(o.contract ?? DEFAULT_HEALTH_WEIGHTS.contract),
    payment: Number(o.payment ?? DEFAULT_HEALTH_WEIGHTS.payment),
    tasks: Number(o.tasks ?? DEFAULT_HEALTH_WEIGHTS.tasks),
  };
}

export function classifyHealth(score: number): HealthClass {
  if (score >= 90) return "excellent";
  if (score >= 75) return "healthy";
  if (score >= 60) return "stable";
  if (score >= 45) return "needs_attention";
  if (score >= 30) return "at_risk";
  return "critical";
}

export function computeHealthScore(
  signal: CustomerSignalInput,
  weights: HealthWeights = DEFAULT_HEALTH_WEIGHTS,
): HealthResult {
  const activityPts =
    signal.daysSinceActivity <= 3
      ? 100
      : signal.daysSinceActivity <= 7
        ? 80
        : signal.daysSinceActivity <= 14
          ? 55
          : signal.daysSinceActivity <= 30
            ? 30
            : 10;

  const adoptionBase =
    (signal.contactCount > 0 ? 25 : 0) +
    (signal.noteCount > 0 ? 20 : 0) +
    (signal.openDealValue + signal.wonDealValue > 0 ? 25 : 0) +
    (signal.intelligenceScore != null
      ? Math.min(30, signal.intelligenceScore * 0.3)
      : 10);
  const adoptionScore = clamp(adoptionBase);

  const supportPts =
    signal.overdueTasks >= 3 ? 20 : signal.overdueTasks >= 1 ? 45 : 90;

  const nps =
    signal.npsHint != null
      ? clamp(50 + signal.npsHint / 2)
      : signal.csatHint != null
        ? clamp(signal.csatHint * 20)
        : 55;

  const revenuePts = clamp(
    20 + Math.min(80, Math.log10(Math.max(1, signal.wonDealValue + 1)) * 25),
  );

  let contractPts = 70;
  if (signal.contractEndsAt) {
    const days = Math.floor(
      (new Date(signal.contractEndsAt).getTime() - Date.now()) /
        (24 * 60 * 60 * 1000),
    );
    contractPts = days < 0 ? 25 : days <= 30 ? 45 : days <= 60 ? 65 : 85;
  }

  const paymentPts = signal.billingPastDue ? 25 : 90;
  const tasksPts =
    signal.openTasks === 0 ? 85 : signal.overdueTasks > 0 ? 35 : 65;

  const totalW =
    weights.activity +
    weights.adoption +
    weights.support +
    weights.nps +
    weights.revenue +
    weights.contract +
    weights.payment +
    weights.tasks;

  const healthScore = clamp(
    (activityPts * weights.activity +
      adoptionScore * weights.adoption +
      supportPts * weights.support +
      nps * weights.nps +
      revenuePts * weights.revenue +
      contractPts * weights.contract +
      paymentPts * weights.payment +
      tasksPts * weights.tasks) /
      Math.max(1, totalW),
  );

  const featureAdoption: Record<string, "high" | "low" | "never"> = {
    crm: signal.noteCount + signal.openTasks > 3 ? "high" : signal.noteCount > 0 ? "low" : "never",
    deals: signal.wonDealValue + signal.openDealValue > 0 ? "high" : "never",
    contacts: signal.contactCount >= 3 ? "high" : signal.contactCount > 0 ? "low" : "never",
    intelligence:
      signal.intelligenceScore != null && signal.intelligenceScore >= 50
        ? "high"
        : signal.intelligenceScore != null
          ? "low"
          : "never",
    tasks: signal.openTasks > 0 || signal.overdueTasks > 0 ? "low" : "never",
  };

  const engagementScore = clamp(
    (activityPts * 0.5 + adoptionScore * 0.3 + (100 - signal.daysSinceActivity) * 0.2),
  );

  const confidence = clamp(
    40 +
      (signal.noteCount > 0 ? 10 : 0) +
      (signal.contractEndsAt ? 15 : 0) +
      (signal.npsHint != null || signal.csatHint != null ? 15 : 0) +
      (signal.wonDealValue > 0 ? 10 : 0),
    0,
    95,
  );

  return {
    healthScore,
    healthClass: classifyHealth(healthScore),
    adoptionScore,
    engagementScore,
    featureAdoption,
    confidence: confidence / 100,
  };
}
