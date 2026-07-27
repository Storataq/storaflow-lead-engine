/**
 * Node test runner for Phase 25G executive analytics calculations.
 * Run: node --experimental-strip-types --test src/lib/crm/executive-analytics/calculations.test.ts
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  average,
  buildFunnelMetrics,
  comparePeriods,
  groupByCurrency,
  overallFunnelConversion,
  distributionCounts,
} from "./calculations.ts";

describe("groupByCurrency", () => {
  it("groups without inventing FX", () => {
    const buckets = groupByCurrency([
      { value: 100, currency: "EUR" },
      { value: 50, currency: "USD" },
      { value: 25, currency: "eur" },
    ]);
    assert.equal(buckets.length, 2);
    const eur = buckets.find((b) => b.currency === "EUR");
    const usd = buckets.find((b) => b.currency === "USD");
    assert.equal(eur?.total, 125);
    assert.equal(usd?.total, 50);
  });
});

describe("comparePeriods", () => {
  it("marks unavailable when previous is missing", () => {
    const t = comparePeriods(10, null);
    assert.equal(t.direction, "unavailable");
    assert.equal(t.percentage, null);
  });

  it("marks unavailable when previous is zero and current positive", () => {
    const t = comparePeriods(10, 0);
    assert.equal(t.direction, "unavailable");
  });

  it("computes up/down", () => {
    const up = comparePeriods(120, 100);
    assert.equal(up.direction, "up");
    assert.equal(up.percentage, 20);
    const down = comparePeriods(80, 100);
    assert.equal(down.direction, "down");
  });
});

describe("funnel", () => {
  it("computes conversion and drop-off", () => {
    const steps = buildFunnelMetrics([
      { id: "a", label: "A", count: 100 },
      { id: "b", label: "B", count: 40 },
      { id: "c", label: "C", count: 10 },
    ]);
    assert.equal(steps[1]!.conversionFromPrevious, 40);
    assert.equal(steps[1]!.dropOffPercent, 60);
    assert.equal(overallFunnelConversion(steps), 10);
  });

  it("handles empty funnel", () => {
    assert.equal(overallFunnelConversion([]), null);
  });
});

describe("distributionCounts", () => {
  it("uses Unknown for missing", () => {
    const rows = distributionCounts([null, "NL", "", "NL"]);
    const unknown = rows.find((r) => r.key === "Unknown");
    const nl = rows.find((r) => r.key === "NL");
    assert.equal(unknown?.count, 2);
    assert.equal(nl?.count, 2);
  });
});

describe("average", () => {
  it("returns null for empty", () => {
    assert.equal(average([]), null);
  });
  it("averages numbers", () => {
    assert.equal(average([10, 20]), 15);
  });
});
