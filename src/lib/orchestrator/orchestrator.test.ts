import assert from "node:assert/strict";
import { describe, it } from "node:test";

/** Self-contained mirrors (node:test has no @/ alias). */

const INTENT_PATTERNS = [
  { intent: "prospecting", patterns: [/zoek.*bedrijven/i, /prospect/i] },
  { intent: "pipeline_analysis", patterns: [/pipeline/i] },
  { intent: "revenue_forecast", patterns: [/voorspel.*omzet/i, /forecast/i] },
  { intent: "upsell", patterns: [/upsell/i] },
  { intent: "executive_report", patterns: [/executive\s*rapport/i] },
];

function detectGoalIntent(goalText) {
  for (const entry of INTENT_PATTERNS) {
    if (entry.patterns.some((p) => p.test(goalText))) return entry.intent;
  }
  return "general";
}

function selectAgentsForIntent(intent) {
  const map = {
    prospecting: ["storaflow-prospecting-agent", "storaflow-kernel-assistant"],
    pipeline_analysis: [
      "storaflow-sales-agent",
      "storaflow-revenue-intelligence-agent",
    ],
    revenue_forecast: ["storaflow-revenue-intelligence-agent"],
    upsell: ["storaflow-customer-success-agent"],
    executive_report: [
      "storaflow-revenue-intelligence-agent",
      "storaflow-sales-agent",
      "storaflow-kernel-assistant",
    ],
    general: ["storaflow-kernel-assistant"],
  };
  return map[intent] ?? map.general;
}

function buildGoalPlan(goalText) {
  const intent = detectGoalIntent(goalText);
  const agents = selectAgentsForIntent(intent);
  const steps = agents.map((slug, i) => ({
    stepKey: `step-${i + 1}`,
    agentSlug: slug,
    dependsOn: i === 0 ? [] : [`step-${i}`],
    parallelGroup: i === 0 ? 0 : agents.length > 2 && i < agents.length - 1 ? 1 : i,
  }));
  return { intent, steps, agents };
}

function mergeResults(results) {
  const seen = new Set();
  let duplicatesRemoved = 0;
  const insights = [];
  for (const r of results) {
    for (const i of r.insights) {
      const key = i.toLowerCase();
      if (seen.has(key)) {
        duplicatesRemoved += 1;
        continue;
      }
      seen.add(key);
      insights.push(i);
    }
  }
  return { insights, duplicatesRemoved };
}

function decideRecovery({ attempt, maxAttempts, agentSlug }) {
  if (attempt < maxAttempts) return { type: "retry" };
  if (!agentSlug.includes("kernel")) {
    return { type: "alternate_agent", agentSlug: "storaflow-kernel-assistant" };
  }
  return { type: "partial_recovery" };
}

describe("orchestrator goal planner", () => {
  it("detects prospecting intent and agents", () => {
    const plan = buildGoalPlan("Zoek 300 interessante bedrijven in Duitsland.");
    assert.equal(plan.intent, "prospecting");
    assert.ok(plan.agents.includes("storaflow-prospecting-agent"));
    assert.ok(plan.steps.length >= 1);
  });

  it("detects pipeline analysis", () => {
    const plan = buildGoalPlan("Analyseer mijn volledige pipeline.");
    assert.equal(plan.intent, "pipeline_analysis");
    assert.ok(plan.agents.includes("storaflow-sales-agent"));
  });
});

describe("orchestrator result merge", () => {
  it("deduplicates insights", () => {
    const merged = mergeResults([
      { insights: ["MRR groeit", "Pipeline daalt"] },
      { insights: ["MRR groeit", "Enterprise groeit"] },
    ]);
    assert.equal(merged.insights.length, 3);
    assert.equal(merged.duplicatesRemoved, 1);
  });
});

describe("orchestrator failure recovery", () => {
  it("retries then falls back to kernel", () => {
    assert.equal(
      decideRecovery({
        attempt: 1,
        maxAttempts: 3,
        agentSlug: "storaflow-sales-agent",
      }).type,
      "retry",
    );
    assert.equal(
      decideRecovery({
        attempt: 3,
        maxAttempts: 3,
        agentSlug: "storaflow-sales-agent",
      }).type,
      "alternate_agent",
    );
  });
});
