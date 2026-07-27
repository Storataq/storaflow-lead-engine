import assert from "node:assert/strict";
import { describe, it } from "node:test";

/** Mirrors revenue-intelligence pure helpers (node:test has no @/ alias). */

function computeKpis(deals) {
  const won = deals.filter((d) => d.status === "won");
  const lost = deals.filter((d) => d.status === "lost");
  const wonRevenue = won.reduce((s, d) => s + d.value, 0);
  const mrr = Math.round((wonRevenue / 12) * 0.35 * 100) / 100;
  const arr = Math.round(mrr * 12 * 100) / 100;
  const churn =
    won.length + lost.length === 0
      ? 0.05
      : lost.length / Math.max(1, won.length + lost.length);
  return { mrr, arr, churn, wonRevenue };
}

function analyzePipeline(deals) {
  const open = deals.filter((d) => d.status === "open");
  const openPipeline = open.reduce((s, d) => s + d.value, 0);
  const weighted = open.reduce(
    (s, d) => s + d.value * ((d.probability ?? 40) / 100),
    0,
  );
  return { openPipeline, weighted };
}

function runScenario(type, mrr) {
  if (type === "more_customers") return { deltaMrr: mrr * 0.1 };
  if (type === "less_churn") return { deltaMrr: mrr * 0.04 };
  if (type === "price_increase") return { deltaMrr: mrr * 0.08 };
  return { deltaMrr: mrr * 0.05 };
}

const deals = [
  { status: "won", value: 12000, probability: 100 },
  { status: "won", value: 8000, probability: 100 },
  { status: "open", value: 10000, probability: 60 },
  { status: "open", value: 5000, probability: 20 },
  { status: "lost", value: 4000, probability: 0 },
];

describe("revenue kpi engine", () => {
  it("computes positive MRR/ARR from won deals", () => {
    const k = computeKpis(deals);
    assert.ok(k.mrr > 0);
    assert.equal(k.arr, Math.round(k.mrr * 12 * 100) / 100);
    assert.ok(k.churn > 0);
  });
});

describe("revenue pipeline forecast", () => {
  it("weights open pipeline below raw open", () => {
    const p = analyzePipeline(deals);
    assert.ok(p.weighted < p.openPipeline);
    assert.equal(p.openPipeline, 15000);
  });
});

describe("revenue scenarios", () => {
  it("applies customer growth lift", () => {
    const s = runScenario("more_customers", 1000);
    assert.equal(s.deltaMrr, 100);
  });
});
