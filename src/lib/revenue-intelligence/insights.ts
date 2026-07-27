/**
 * Growth, churn, expansion, scenarios, insights, reports.
 */

import {
  REVENUE_REC_LABELS,
  SCENARIO_TYPE_LABELS,
  type ReportType,
  type RevenueRecType,
  type ScenarioType,
} from "@/lib/revenue-intelligence/constants";
import type {
  ChurnMetrics,
  ExecutiveReport,
  ExpansionOpportunity,
  GrowthMetrics,
  PipelineForecast,
  RevenueAlert,
  RevenueDealSignal,
  RevenueInsight,
  RevenueKpiBundle,
  RevenueRecommendation,
  ScenarioResult,
} from "@/lib/revenue-intelligence/types";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export function analyzeGrowth(
  deals: RevenueDealSignal[],
  kpis: RevenueKpiBundle,
): GrowthMetrics {
  const now = Date.now();
  const day30 = 30 * 24 * 60 * 60 * 1000;
  const recentWon = deals.filter(
    (d) =>
      d.status === "won" &&
      d.closedAt &&
      now - new Date(d.closedAt).getTime() <= day30,
  );
  const upsell = deals.filter(
    (d) => d.status === "open" && /upsell|upgrade|expansion/i.test(d.title),
  );
  const cross = deals.filter(
    (d) => d.status === "open" && /cross|module|addon/i.test(d.title),
  );
  const renewals = deals.filter(
    (d) => /renew|verlenging|contract/i.test(d.title),
  ).length;

  return {
    newCustomers: recentWon.length,
    newRevenue: round2(recentWon.reduce((s, d) => s + d.value, 0)),
    recurringRevenue: kpis.mrr,
    upsellRevenue: round2(upsell.reduce((s, d) => s + d.value, 0)),
    crossSellRevenue: round2(cross.reduce((s, d) => s + d.value, 0)),
    renewals,
    growthRate: kpis.growthRate,
  };
}

export function analyzeRevenueChurn(
  deals: RevenueDealSignal[],
  kpis: RevenueKpiBundle,
): ChurnMetrics {
  const won = deals.filter((d) => d.status === "won");
  const lost = deals.filter((d) => d.status === "lost");
  const closed = won.length + lost.length;
  const logoChurn = lost.length;
  const customerChurnRate =
    closed === 0 ? 0.04 : clamp01(lost.length / Math.max(1, closed));
  const lostValue = lost.reduce((s, d) => s + d.value, 0);
  const revenueChurnRate =
    kpis.grossRevenue <= 0
      ? customerChurnRate
      : clamp01(lostValue / Math.max(1, kpis.grossRevenue + lostValue));
  const expectedChurnRevenue = round2(kpis.mrr * 12 * revenueChurnRate);

  return {
    customerChurnRate: round2(customerChurnRate),
    revenueChurnRate: round2(revenueChurnRate),
    logoChurn,
    expectedChurnRevenue,
    impact:
      revenueChurnRate >= 0.15
        ? "Hoog — focus op retention"
        : revenueChurnRate >= 0.08
          ? "Medium — monitor at-risk accounts"
          : "Laag — retention gezond",
    confidence: clamp01(0.4 + (closed >= 5 ? 0.25 : 0.1) + kpis.confidence * 0.2),
  };
}

export function detectExpansion(
  deals: RevenueDealSignal[],
  kpis: RevenueKpiBundle,
): ExpansionOpportunity[] {
  const out: ExpansionOpportunity[] = [];
  const openValue = deals
    .filter((d) => d.status === "open")
    .reduce((s, d) => s + d.value, 0);

  if (kpis.arpa > 0 && kpis.customerCount >= 3) {
    out.push({
      code: "more_users",
      label: "Meer gebruikers / seats",
      rationale: "ARPA en klantbasis ondersteunen seat expansion",
      potentialRevenue: round2(kpis.mrr * 0.12),
    });
  }
  if (openValue > 0) {
    out.push({
      code: "upsell_pipeline",
      label: "Upsell in open pipeline",
      rationale: `€${Math.round(openValue).toLocaleString("nl-NL")} open deals`,
      potentialRevenue: round2(openValue * 0.25),
    });
  }
  if (kpis.ltvCac >= 3) {
    out.push({
      code: "enterprise",
      label: "Enterprise upgrades",
      rationale: `LTV/CAC ${kpis.ltvCac} — schaal premium`,
      potentialRevenue: round2(kpis.arr * 0.08),
    });
  }
  out.push({
    code: "new_modules",
    label: "Nieuwe modules / AI diensten",
    rationale: "Cross-sell AI agents en add-ons",
    potentialRevenue: round2(kpis.mrr * 0.1),
  });
  out.push({
    code: "white_label",
    label: "White Label / Marketplace",
    rationale: "Extra recurring revenue streams",
    potentialRevenue: round2(kpis.arr * 0.05),
  });
  out.push({
    code: "new_markets",
    label: "Nieuwe landen / regio's",
    rationale: "Internationale groei op stabiele unit economics",
    potentialRevenue: round2(kpis.mrr * 0.15),
  });

  return out.slice(0, 8);
}

export function runScenario(
  type: ScenarioType,
  kpis: RevenueKpiBundle,
): ScenarioResult {
  const assumptions: Record<string, number> = {};
  let deltaMrr = 0;
  let deltaProfit = 0;

  switch (type) {
    case "more_customers":
      assumptions.customerGrowth = 0.1;
      deltaMrr = kpis.mrr * 0.1;
      deltaProfit = deltaMrr * 12 * kpis.marginRate;
      break;
    case "less_churn":
      assumptions.churnReduction = 0.2;
      deltaMrr = kpis.mrr * 0.04;
      deltaProfit = deltaMrr * 12 * kpis.marginRate * 1.1;
      break;
    case "price_increase":
      assumptions.priceLift = 0.08;
      deltaMrr = kpis.mrr * 0.08;
      deltaProfit = deltaMrr * 12 * (kpis.marginRate + 0.05);
      break;
    case "extra_sales_hire":
      assumptions.hireCostMonthly = 5500;
      deltaMrr = kpis.mrr * 0.06;
      deltaProfit = deltaMrr * 12 * kpis.marginRate - 5500 * 12;
      break;
    case "new_market":
      assumptions.marketCapex = 25000;
      deltaMrr = kpis.mrr * 0.12;
      deltaProfit = deltaMrr * 12 * kpis.marginRate - 25000;
      break;
    case "new_product":
      assumptions.productInvest = 40000;
      deltaMrr = kpis.mrr * 0.15;
      deltaProfit = deltaMrr * 12 * kpis.marginRate - 40000;
      break;
    case "new_ai_agent":
      assumptions.aiInvest = 12000;
      deltaMrr = kpis.mrr * 0.07;
      deltaProfit = deltaMrr * 12 * (kpis.marginRate + 0.03) - 12000;
      break;
    default:
      assumptions.customLift = 0.05;
      deltaMrr = kpis.mrr * 0.05;
      deltaProfit = deltaMrr * 12 * kpis.marginRate;
  }

  const deltaArr = round2(deltaMrr * 12);
  return {
    type,
    name: SCENARIO_TYPE_LABELS[type],
    assumptions,
    deltaMrr: round2(deltaMrr),
    deltaArr,
    deltaProfit: round2(deltaProfit),
    impact: {
      newMrr: round2(kpis.mrr + deltaMrr),
      newArr: round2(kpis.arr + deltaArr),
      paybackMonths:
        deltaMrr <= 0
          ? null
          : Math.max(1, Math.round(Math.abs(Math.min(0, deltaProfit)) / deltaMrr)),
    },
  };
}

export function buildInsights(
  kpis: RevenueKpiBundle,
  growth: GrowthMetrics,
  churn: ChurnMetrics,
  pipeline: PipelineForecast,
): RevenueInsight[] {
  const insights: RevenueInsight[] = [];
  const mrrPct = Math.round(kpis.growthRate * 100);

  insights.push({
    type: "mrr_growth",
    title: `MRR groeit ${mrrPct}%`,
    body: `Huidige MRR €${kpis.mrr.toLocaleString("nl-NL")} · ARR €${kpis.arr.toLocaleString("nl-NL")}`,
    severity: kpis.growthRate >= 0 ? "positive" : "warning",
    priority: 80,
  });

  if (pipeline.openPipeline > 0 && pipeline.riskRevenue > pipeline.likelyRevenue) {
    insights.push({
      type: "pipeline_trend",
      title: "Pipeline risico hoger dan likely revenue",
      body: `Risk €${pipeline.riskRevenue.toLocaleString("nl-NL")} vs likely €${pipeline.likelyRevenue.toLocaleString("nl-NL")}`,
      severity: "warning",
      priority: 85,
    });
  } else {
    insights.push({
      type: "pipeline_trend",
      title: "Pipeline gezond gewogen",
      body: `Weighted €${pipeline.weightedPipeline.toLocaleString("nl-NL")}`,
      severity: "info",
      priority: 55,
    });
  }

  insights.push({
    type: "arr_change",
    title: kpis.arr > 0 ? "ARR stijgt met recurring basis" : "ARR nog beperkt",
    body: `ARR €${kpis.arr.toLocaleString("nl-NL")} · NRR ${(kpis.nrr * 100).toFixed(0)}%`,
    severity: kpis.nrr >= 1 ? "positive" : "info",
    priority: 70,
  });

  if (growth.upsellRevenue > 0) {
    insights.push({
      type: "upsell_potential",
      title: "Upsell potentieel hoog",
      body: `€${growth.upsellRevenue.toLocaleString("nl-NL")} in upsell pipeline`,
      severity: "positive",
      priority: 75,
    });
  }

  if (churn.revenueChurnRate >= 0.1) {
    insights.push({
      type: "churn_risk",
      title: "Revenue churn verhoogd",
      body: churn.impact,
      severity: "critical",
      priority: 90,
    });
  }

  insights.push({
    type: "executive",
    title: kpis.ltvCac >= 3 ? "Focus op Enterprise schaal" : "Verbeter unit economics",
    body: `LTV/CAC ${kpis.ltvCac} · marge ${(kpis.marginRate * 100).toFixed(0)}%`,
    severity: kpis.ltvCac >= 3 ? "positive" : "warning",
    priority: 78,
  });

  return insights.sort((a, b) => b.priority - a.priority);
}

export function buildRecommendations(
  kpis: RevenueKpiBundle,
  churn: ChurnMetrics,
  pipeline: PipelineForecast,
): RevenueRecommendation[] {
  const recs: RevenueRecommendation[] = [];
  const add = (type: RevenueRecType, rationale: string, priority: number) => {
    recs.push({
      type,
      title: REVENUE_REC_LABELS[type],
      rationale,
      priority,
    });
  };

  if (churn.revenueChurnRate >= 0.1) {
    add("reduce_churn", `Revenue churn ${(churn.revenueChurnRate * 100).toFixed(0)}%`, 92);
  }
  if (pipeline.riskRevenue > pipeline.likelyRevenue) {
    add("more_sales", "Pipeline risk — verhoog closing capacity", 84);
  }
  if (kpis.growthRate < 0.05) {
    add("more_marketing", "Groei onder 5% — pipeline vullen", 80);
  }
  if (kpis.ltvCac >= 3) {
    add("expand_enterprise", "Sterke unit economics voor enterprise push", 76);
    add("pricing", "Ruimte voor prijsoptimalisatie", 68);
  } else {
    add("invest_more", "Verbeter LTV/CAC via onboarding & retention", 72);
  }
  add("new_region", "Test internationale groei op top segment", 60);
  add("new_campaign", "Revenue-campagne op expansion opportunities", 58);
  add("new_ai_workflow", "Automatiseer forecast + churn alerts", 55);

  return recs.sort((a, b) => b.priority - a.priority).slice(0, 10);
}

export function buildAlerts(
  kpis: RevenueKpiBundle,
  churn: ChurnMetrics,
  pipeline: PipelineForecast,
  prevMrr?: number,
): RevenueAlert[] {
  const alerts: RevenueAlert[] = [];
  if (prevMrr != null && kpis.mrr < prevMrr * 0.97) {
    alerts.push({
      type: "mrr_down",
      severity: "high",
      title: "MRR daalt",
      message: `MRR €${kpis.mrr} vs vorige €${prevMrr}`,
    });
  }
  if (kpis.growthRate < -0.02) {
    alerts.push({
      type: "revenue_down",
      severity: "critical",
      title: "Omzetgroei negatief",
      message: `Growth ${(kpis.growthRate * 100).toFixed(1)}%`,
    });
  }
  if (pipeline.riskRevenue > pipeline.weightedPipeline * 0.5) {
    alerts.push({
      type: "pipeline_risk",
      severity: "high",
      title: "Pipeline risico",
      message: `Risk revenue €${pipeline.riskRevenue.toLocaleString("nl-NL")}`,
    });
  }
  if (churn.revenueChurnRate >= 0.12) {
    alerts.push({
      type: "high_churn",
      severity: "critical",
      title: "Veel churn",
      message: churn.impact,
    });
  }
  if (kpis.confidence < 0.45) {
    alerts.push({
      type: "forecast_deviation",
      severity: "medium",
      title: "Lage forecast confidence",
      message: `Confidence ${(kpis.confidence * 100).toFixed(0)}% — meer billing/CRM data nodig`,
    });
  }
  const winRateHint =
    pipeline.expectedClosings === 0 && pipeline.openPipeline > 0 ? 0.1 : 0.3;
  if (winRateHint < 0.2 && pipeline.openPipeline > 0) {
    alerts.push({
      type: "low_conversion",
      severity: "medium",
      title: "Lage conversie-signalen",
      message: "Weinige expected closings t.o.v. open pipeline",
    });
  }
  if (kpis.growthRate < 0 && churn.revenueChurnRate > 0.08) {
    alerts.push({
      type: "negative_trend",
      severity: "high",
      title: "Negatieve trend",
      message: "Groei en churn bewegen ongunstig samen",
    });
  }
  return alerts;
}

export function buildExecutiveReport(
  type: ReportType,
  kpis: RevenueKpiBundle,
  insights: RevenueInsight[],
  forecasts: Array<{ horizon: string; forecastRevenue: number }>,
): ExecutiveReport {
  const titleMap: Record<ReportType, string> = {
    ceo: "CEO Report — Revenue Intelligence",
    board: "Board Report — Growth & Risk",
    investor: "Investor Report — ARR & Unit Economics",
    finance: "Finance Report — KPI Pack",
    growth: "Growth Report — Expansion & New Revenue",
    forecast: "Forecast Report — Horizons",
  };

  const month = forecasts.find((f) => f.horizon === "month");
  const year = forecasts.find((f) => f.horizon === "year");
  const sections = [
    {
      heading: "Executive Summary",
      body: `MRR €${kpis.mrr.toLocaleString("nl-NL")} · ARR €${kpis.arr.toLocaleString("nl-NL")} · NRR ${(kpis.nrr * 100).toFixed(0)}% · LTV/CAC ${kpis.ltvCac}`,
    },
    {
      heading: "Forecast",
      body: `Maand €${(month?.forecastRevenue ?? 0).toLocaleString("nl-NL")} · Jaar €${(year?.forecastRevenue ?? 0).toLocaleString("nl-NL")}`,
    },
    {
      heading: "Key Insights",
      body: insights
        .slice(0, 5)
        .map((i) => `- ${i.title}: ${i.body}`)
        .join("\n"),
    },
  ];

  const bodyMarkdown = [
    `# ${titleMap[type]}`,
    "",
    ...sections.flatMap((s) => [`## ${s.heading}`, s.body, ""]),
    "_PowerPoint / PDF / Excel ready — export body_markdown + sections_json._",
  ].join("\n");

  return {
    type,
    title: titleMap[type],
    bodyMarkdown,
    sections,
  };
}

export function executiveSummary(
  kpis: RevenueKpiBundle,
  insights: RevenueInsight[],
): string {
  const top = insights[0];
  return `MRR €${Math.round(kpis.mrr).toLocaleString("nl-NL")} (${Math.round(kpis.growthRate * 100)}%). ARR €${Math.round(kpis.arr).toLocaleString("nl-NL")}. ${top ? top.title + "." : ""}`;
}
