/**
 * Churn prediction engine.
 */

import type { ChurnResult, CustomerSignalInput } from "@/lib/customer-success/types";

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export function predictChurn(
  signal: CustomerSignalInput,
  healthScore: number,
  churnThreshold = 55,
): ChurnResult {
  let score = 0.12;
  const reasons: string[] = [];

  if (signal.daysSinceActivity >= 30) {
    score += 0.28;
    reasons.push("Geen activiteit ≥30 dagen");
  } else if (signal.daysSinceActivity >= 14) {
    score += 0.16;
    reasons.push("Lage activiteit (≥14 dagen)");
  }

  if (healthScore < 30) {
    score += 0.25;
    reasons.push("Critical health score");
  } else if (healthScore < churnThreshold) {
    score += 0.14;
    reasons.push("Health onder churn-drempel");
  }

  if (signal.overdueTasks >= 2) {
    score += 0.1;
    reasons.push("Meerdere overdue taken (support-druk)");
  }

  if (signal.billingPastDue) {
    score += 0.18;
    reasons.push("Betaalachterstand");
  }

  if (signal.contractEndsAt) {
    const days = Math.floor(
      (new Date(signal.contractEndsAt).getTime() - Date.now()) /
        (24 * 60 * 60 * 1000),
    );
    if (days >= 0 && days <= 45 && healthScore < 60) {
      score += 0.12;
      reasons.push("Renewal nabij met zwakke health");
    }
  }

  if (signal.wonDealValue <= 0 && signal.openDealValue <= 0) {
    score += 0.05;
    reasons.push("Geen actieve omzetrelatie in CRM");
  }

  const probability = clamp01(score);
  const actions: string[] = [];
  if (probability >= 0.55) {
    actions.push("Bel klant vandaag", "Plan success review", "Bied support/training");
  } else if (probability >= 0.35) {
    actions.push("Stuur check-in e-mail", "Deel adoption tip", "Monitor login-activiteit");
  } else {
    actions.push("Houd cadence; plan periodieke review");
  }

  const impact =
    probability >= 0.55
      ? `Hoog — potentieel verlies €${Math.round(signal.wonDealValue || signal.openDealValue || 0).toLocaleString("nl-NL")}`
      : probability >= 0.35
        ? "Medium — engagement herstellen voorkomt churn"
        : "Laag — relatie stabiel";

  const confidence = clamp01(
    0.35 +
      (reasons.length * 0.08) +
      (signal.contractEndsAt ? 0.1 : 0) +
      (signal.billingPastDue ? 0.1 : 0),
  );

  return {
    probability: Math.round(probability * 100) / 100,
    reason: reasons[0] ?? "Geen sterke churn-signalen",
    confidence: Math.round(confidence * 100) / 100,
    actions,
    impact,
  };
}
