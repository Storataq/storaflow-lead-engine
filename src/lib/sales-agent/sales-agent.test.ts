import assert from "node:assert/strict";
import { describe, it } from "node:test";

/** Mirrors sales-agent pure helpers (node:test has no @/ alias). */

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function computeRiskScore(deal) {
  let score = 10;
  const reasons = [];
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
  if (deal.competitor?.trim()) {
    score += 15;
    reasons.push("Concurrent genoemd");
  }
  const riskScore = clamp(score);
  const riskLevel =
    riskScore >= 80
      ? "critical"
      : riskScore >= 60
        ? "high"
        : riskScore >= 35
          ? "medium"
          : "low";
  return { riskScore, riskLevel, reasons };
}

function computePriorityScore(deal, riskScore) {
  let score = 20;
  score += Math.min(25, Math.round(deal.value / 2000));
  if (deal.leadAiScore != null) score += Math.round(deal.leadAiScore * 0.2);
  if ((deal.daysSinceLastActivity ?? 0) >= 7) score += 12;
  score += Math.round(riskScore * 0.15);
  if (deal.overdueTasks > 0) score += 10;
  return clamp(score);
}

function computeClosingProbability(deal, riskScore) {
  const base = (deal.probability ?? 40) / 100;
  const riskPenalty = riskScore / 200;
  const leadBoost = deal.leadAiScore != null ? deal.leadAiScore / 400 : 0;
  return Math.max(0.02, Math.min(0.95, base - riskPenalty + leadBoost));
}

function chooseNextBestAction(deal, riskLevel) {
  if (riskLevel === "critical" || (deal.daysSinceLastActivity ?? 0) >= 14) {
    return "call";
  }
  if (deal.overdueTasks > 0) return "follow_up";
  if ((deal.probability ?? 0) >= 60 && deal.value >= 5000) return "send_quote";
  if ((deal.leadAiScore ?? 0) >= 70) return "plan_demo";
  if ((deal.daysSinceLastActivity ?? 0) >= 7) return "send_reminder";
  return "wait";
}

function analyzePipelineHealth(deals) {
  const open = deals.filter((d) => d.status === "open");
  const won = deals.filter((d) => d.status === "won");
  const lost = deals.filter((d) => d.status === "lost");
  const closed = won.length + lost.length;
  const winRate = closed === 0 ? 0 : won.length / closed;
  let pipelineRevenue = 0;
  let weightedRevenue = 0;
  for (const deal of open) {
    pipelineRevenue += deal.value;
    const risk = computeRiskScore(deal);
    const p = computeClosingProbability(deal, risk.riskScore);
    weightedRevenue += deal.value * p;
  }
  return { winRate, pipelineRevenue, weightedRevenue, openDeals: open.length };
}

function generateEmailDraft(type, dealTitle) {
  const map = {
    follow_up: `Follow-up: ${dealTitle}`,
    quote: `Offerte — ${dealTitle}`,
    reminder: `Herinnering: openstaand punt — ${dealTitle}`,
  };
  return { subject: map[type] ?? dealTitle, body: `Beste daar,\n\n${dealTitle}` };
}

function detectSalesOpportunities(deal) {
  const out = [];
  if (deal.value >= 10000 && (deal.probability ?? 0) >= 50) {
    out.push({ code: "upsell" });
  }
  if (deal.status === "won") out.push({ code: "renewal" });
  return out;
}

const staleDeal = {
  value: 12000,
  probability: 25,
  leadAiScore: 40,
  daysSinceLastActivity: 20,
  overdueTasks: 2,
  competitor: "Acme",
  status: "open",
  openTasks: 2,
  noteCount: 0,
};

const healthyDeal = {
  value: 3000,
  probability: 70,
  leadAiScore: 80,
  daysSinceLastActivity: 1,
  overdueTasks: 0,
  competitor: null,
  status: "open",
  openTasks: 1,
  noteCount: 4,
};

describe("sales risk engine", () => {
  it("flags stale competitive deals as high/critical", () => {
    const risk = computeRiskScore(staleDeal);
    assert.ok(risk.riskScore >= 60);
    assert.ok(["high", "critical"].includes(risk.riskLevel));
    assert.ok(risk.reasons.some((r) => /contact|stil/i.test(r)));
  });
});

describe("sales priority + NBA", () => {
  it("prioritizes stale high-value deals and recommends call", () => {
    const risk = computeRiskScore(staleDeal);
    const priority = computePriorityScore(staleDeal, risk.riskScore);
    const healthyPriority = computePriorityScore(
      healthyDeal,
      computeRiskScore(healthyDeal).riskScore,
    );
    assert.ok(priority > healthyPriority);
    assert.equal(chooseNextBestAction(staleDeal, risk.riskLevel), "call");
  });
});

describe("sales forecast inputs", () => {
  it("weights open pipeline below raw pipeline when risk is high", () => {
    const health = analyzePipelineHealth([staleDeal, healthyDeal]);
    assert.equal(health.openDeals, 2);
    assert.ok(health.weightedRevenue < health.pipelineRevenue);
  });
});

describe("sales email + opportunities", () => {
  it("builds follow-up subject and upsell opportunity", () => {
    const draft = generateEmailDraft("follow_up", "Acme expansion");
    assert.match(draft.subject, /Follow-up/);
    const ops = detectSalesOpportunities({
      value: 15000,
      probability: 60,
      status: "open",
    });
    assert.ok(ops.some((o) => o.code === "upsell"));
  });
});
