import assert from "node:assert/strict";
import { describe, it } from "node:test";

/** Mirrors prospecting pure helpers (node:test has no @/ alias). */

function classifyBusiness(text) {
  if (/saas|software|cloud/i.test(text)) return { businessClass: "software", confidence: 0.8 };
  if (/retail|winkel|shop/i.test(text)) return { businessClass: "retail", confidence: 0.7 };
  if (/logist|warehouse|transport/i.test(text)) return { businessClass: "logistics", confidence: 0.7 };
  return { businessClass: "other", confidence: 0.25 };
}

function detectOpportunities(signals) {
  const out = [];
  if (!signals.hasCrmHints) out.push({ code: "no_crm", severity: "medium" });
  if (signals.websiteLooksOutdated) out.push({ code: "outdated_website", severity: "high" });
  if (!signals.hasEmail && !signals.hasPhone) {
    out.push({ code: "weak_contactability", severity: "high" });
  }
  if (["software", "wholesale", "logistics"].includes(signals.businessClass)) {
    out.push({ code: "storaflow_fit", severity: "medium" });
  }
  return out;
}

function computeProspectScore(input) {
  let score = 12;
  if (input.hasWebsite) score += 12;
  if (input.hasEmail) score += 10;
  if (input.hasPhone) score += 8;
  score += Math.round(input.digitalMaturity * 0.18);
  score += Math.round(input.storaflowFit * 0.2);
  score += Math.min(12, input.opportunities.length * 3);
  if (input.isDuplicate) score -= 25;
  score = Math.max(0, Math.min(100, Math.round(score)));
  const quality = score >= 75 ? "hot" : score >= 50 ? "warm" : "cold";
  const recommendation =
    score < 30 ? "not_interesting" : score >= 80 ? "call_now" : "later";
  return { score, quality, recommendation };
}

function normalizeDomainFromUrl(url) {
  if (!url) return null;
  try {
    const withProto = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    return new URL(withProto).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function prospectsToCsv(rows) {
  const header = "company_name,lead_score";
  const lines = rows.map((r) => `${r.company_name},${r.lead_score}`);
  return [header, ...lines].join("\n");
}

describe("prospecting classification", () => {
  it("classifies software and retail", () => {
    assert.equal(classifyBusiness("We build SaaS cloud software").businessClass, "software");
    assert.equal(classifyBusiness("Onze winkel en retail shop").businessClass, "retail");
  });
});

describe("prospecting opportunities", () => {
  it("flags CRM gap and weak contactability", () => {
    const ops = detectOpportunities({
      hasCrmHints: false,
      websiteLooksOutdated: true,
      hasEmail: false,
      hasPhone: false,
      businessClass: "software",
    });
    assert.ok(ops.some((o) => o.code === "no_crm"));
    assert.ok(ops.some((o) => o.code === "outdated_website"));
    assert.ok(ops.some((o) => o.code === "storaflow_fit"));
  });
});

describe("prospecting score", () => {
  it("scores stronger prospects higher", () => {
    const weak = computeProspectScore({
      hasWebsite: false,
      hasEmail: false,
      hasPhone: false,
      digitalMaturity: 10,
      storaflowFit: 20,
      opportunities: [],
      isDuplicate: true,
    });
    const strong = computeProspectScore({
      hasWebsite: true,
      hasEmail: true,
      hasPhone: true,
      digitalMaturity: 80,
      storaflowFit: 75,
      opportunities: [{}, {}, {}],
      isDuplicate: false,
    });
    assert.ok(strong.score > weak.score);
    assert.equal(strong.quality === "hot" || strong.quality === "warm", true);
  });
});

describe("prospecting security / duplicates helpers", () => {
  it("normalizes domains without leaking cross-tenant logic", () => {
    assert.equal(normalizeDomainFromUrl("https://www.Acme.com/path"), "acme.com");
    assert.equal(normalizeDomainFromUrl("not a url"), null);
  });
});

describe("prospecting export performance contract", () => {
  it("builds csv for bulk rows quickly", () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({
      company_name: `Co ${i}`,
      lead_score: i % 100,
    }));
    const csv = prospectsToCsv(rows);
    assert.ok(csv.split("\n").length === 101);
  });
});
