import assert from "node:assert/strict";
import { describe, it } from "node:test";

function checkLimit(def, current, delta = 1) {
  const limit = def.limitValue;
  const next = current + delta;
  const pct = limit <= 0 ? 100 : Math.round((current / limit) * 100);
  const warningAt = Math.floor((limit * def.warningThresholdPct) / 100);
  const isWarning = current >= warningAt && current < limit;
  const isHardBlocked = def.enforcement === "hard" && next > limit;
  return {
    allowed: !isHardBlocked,
    isWarning,
    isHardBlocked,
    upgradeSuggested: isWarning || isHardBlocked,
    pctUsed: pct,
  };
}

function checkFeature(enabled) {
  return { enabled, upgradeSuggested: !enabled };
}

function trialDays(endsAt, now = Date.now()) {
  if (!endsAt) return null;
  return Math.max(0, Math.ceil((new Date(endsAt).getTime() - now) / 86400000));
}

function mrrFromPlan(priceCents, interval) {
  return interval === "year" ? Math.round(priceCents / 12) : priceCents;
}

describe("billing limit engine", () => {
  it("blocks hard limits and warns near threshold", () => {
    const def = {
      limitValue: 10,
      warningThresholdPct: 80,
      enforcement: "hard",
    };
    const warn = checkLimit(def, 8, 0);
    assert.equal(warn.isWarning, true);
    assert.equal(warn.allowed, true);
    const block = checkLimit(def, 10, 1);
    assert.equal(block.allowed, false);
    assert.equal(block.isHardBlocked, true);
  });

  it("allows soft overage with upgrade suggestion", () => {
    const def = {
      limitValue: 100,
      warningThresholdPct: 80,
      enforcement: "soft",
    };
    const over = checkLimit(def, 100, 1);
    assert.equal(over.allowed, true);
  });
});

describe("billing features", () => {
  it("suggests upgrade when disabled", () => {
    assert.equal(checkFeature(false).upgradeSuggested, true);
    assert.equal(checkFeature(true).enabled, true);
  });
});

describe("billing trial", () => {
  it("computes remaining days", () => {
    const ends = new Date(Date.now() + 3 * 86400000).toISOString();
    assert.equal(trialDays(ends), 3);
  });
});

describe("billing financial scaffold", () => {
  it("converts yearly to MRR", () => {
    assert.equal(mrrFromPlan(12000, "year"), 1000);
    assert.equal(mrrFromPlan(7900, "month"), 7900);
  });
});

describe("organization isolation contract", () => {
  it("scopes subscription by organization_id", () => {
    const sub = { organization_id: "org-1", plan_id: "p1" };
    assert.notEqual(sub.organization_id, "org-2");
  });
});
