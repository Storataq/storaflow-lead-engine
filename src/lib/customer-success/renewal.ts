/**
 * Renewal engine.
 */

import type {
  CustomerSignalInput,
  RenewalResult,
} from "@/lib/customer-success/types";

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export function analyzeRenewal(
  signal: CustomerSignalInput,
  healthScore: number,
  churnProbability: number,
  renewalWindowDays = 60,
): RenewalResult {
  const ends = signal.contractEndsAt;
  if (!ends) {
    // Infer soft renewal horizon from company age / period
    const inferred = new Date();
    inferred.setDate(inferred.getDate() + Math.max(30, 365 - (signal.daysSinceActivity % 120)));
    return {
      contractEndsAt: inferred.toISOString().slice(0, 10),
      probability: clamp01(0.55 + healthScore / 250 - churnProbability * 0.4),
      riskLevel: churnProbability >= 0.55 ? "high" : healthScore < 50 ? "medium" : "low",
      recommendations: [
        "Bevestig contracteinddatum in CRM/billing",
        "Plan QBR vóór verwachte renewal",
      ],
      tasks: ["Bevestig contractdatum", "Plan renewal gesprek"],
    };
  }

  const days = Math.floor(
    (new Date(ends).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
  );
  let probability = clamp01(0.4 + healthScore / 200 - churnProbability * 0.5);
  if (days < 0) probability = clamp01(probability - 0.2);
  if (days >= 0 && days <= renewalWindowDays) {
    probability = clamp01(probability - (renewalWindowDays - days) / 400);
  }

  const riskLevel: RenewalResult["riskLevel"] =
    days < 0 || churnProbability >= 0.6 || healthScore < 35
      ? "critical"
      : days <= 30 || churnProbability >= 0.45 || healthScore < 50
        ? "high"
        : days <= renewalWindowDays || healthScore < 65
          ? "medium"
          : "low";

  const recommendations = [
    days <= 45 ? "Start renewal gesprek deze week" : "Zet renewal op agenda",
    healthScore < 60 ? "Los health-issues op vóór renewal" : "Deel ROI-samenvatting",
    signal.billingPastDue ? "Los openstaande betaling eerst op" : "Bevestig seats/plan",
  ];

  const tasks = [
    `Renewal check — ${signal.companyName}`,
    "Update success plan milestone",
    riskLevel === "high" || riskLevel === "critical"
      ? "Escalatie naar account owner"
      : "Stuur renewal reminder",
  ];

  return {
    contractEndsAt: ends.slice(0, 10),
    probability: Math.round(probability * 100) / 100,
    riskLevel,
    recommendations,
    tasks,
  };
}
