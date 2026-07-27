import assert from "node:assert/strict";
import { describe, it } from "node:test";

/** Mirrors customer-success pure helpers (node:test has no @/ alias). */

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function classifyHealth(score) {
  if (score >= 90) return "excellent";
  if (score >= 75) return "healthy";
  if (score >= 60) return "stable";
  if (score >= 45) return "needs_attention";
  if (score >= 30) return "at_risk";
  return "critical";
}

function computeHealthScore(signal) {
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
  const adoption = clamp(
    (signal.contactCount > 0 ? 25 : 0) +
      (signal.noteCount > 0 ? 20 : 0) +
      (signal.wonDealValue > 0 ? 25 : 0) +
      10,
  );
  const support = signal.overdueTasks >= 2 ? 30 : 85;
  const payment = signal.billingPastDue ? 25 : 90;
  const healthScore = clamp(
    activityPts * 0.25 + adoption * 0.2 + support * 0.2 + payment * 0.15 + 50 * 0.2,
  );
  return { healthScore, healthClass: classifyHealth(healthScore) };
}

function predictChurn(signal, healthScore) {
  let score = 0.12;
  if (signal.daysSinceActivity >= 30) score += 0.28;
  if (healthScore < 30) score += 0.25;
  if (signal.billingPastDue) score += 0.18;
  return Math.max(0, Math.min(1, score));
}

function buildOnboarding(signal) {
  const items = [
    Boolean(signal.companyName),
    signal.contactCount >= 1,
    signal.daysSinceActivity <= 14,
    signal.wonDealValue > 0 || signal.noteCount >= 2,
  ];
  const done = items.filter(Boolean).length;
  return Math.round((done / items.length) * 100);
}

function detectUpsell(signal, healthScore) {
  const out = [];
  if (signal.contactCount >= 3) out.push("more_users");
  if (healthScore >= 80) out.push("enterprise");
  if (signal.overdueTasks >= 1) out.push("premium_support");
  return out;
}

const healthy = {
  companyName: "Acme",
  daysSinceActivity: 2,
  contactCount: 4,
  noteCount: 3,
  wonDealValue: 20000,
  overdueTasks: 0,
  billingPastDue: false,
};

const atRisk = {
  companyName: "Silent Co",
  daysSinceActivity: 40,
  contactCount: 0,
  noteCount: 0,
  wonDealValue: 0,
  overdueTasks: 3,
  billingPastDue: true,
};

describe("cs health engine", () => {
  it("scores healthy customers higher", () => {
    const h = computeHealthScore(healthy);
    const r = computeHealthScore(atRisk);
    assert.ok(h.healthScore > r.healthScore);
    assert.ok(["excellent", "healthy", "stable"].includes(h.healthClass));
    assert.ok(["needs_attention", "at_risk", "critical"].includes(r.healthClass));
  });
});

describe("cs churn engine", () => {
  it("predicts higher churn for silent past-due accounts", () => {
    const h = computeHealthScore(healthy).healthScore;
    const r = computeHealthScore(atRisk).healthScore;
    assert.ok(predictChurn(atRisk, r) > predictChurn(healthy, h));
  });
});

describe("cs onboarding + upsell", () => {
  it("tracks onboarding progress and upsell signals", () => {
    assert.ok(buildOnboarding(healthy) > buildOnboarding(atRisk));
    assert.ok(detectUpsell(healthy, 85).includes("enterprise"));
    assert.ok(detectUpsell(atRisk, 40).includes("premium_support"));
  });
});
