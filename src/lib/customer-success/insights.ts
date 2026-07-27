/**
 * Upsell / cross-sell engines + insights + recommendations + alerts.
 */

import {
  CROSS_SELL_LABELS,
  CS_RECOMMENDATION_LABELS,
  UPSELL_LABELS,
  type CrossSellProduct,
  type CsRecommendationType,
  type UpsellOpportunity,
} from "@/lib/customer-success/constants";
import type {
  CrossSellItem,
  CsAlert,
  CsInsightBundle,
  CsRecommendation,
  CustomerSignalInput,
  UpsellItem,
} from "@/lib/customer-success/types";

export function detectUpsell(signal: CustomerSignalInput, healthScore: number): UpsellItem[] {
  const out: UpsellItem[] = [];
  const push = (code: UpsellOpportunity, rationale: string) => {
    out.push({ code, label: UPSELL_LABELS[code], rationale });
  };

  if (signal.contactCount >= 3 || (signal.seatsPurchased != null && signal.seatsPurchased < 10)) {
    push("more_users", "Meerdere contacten — seats uitbreiden");
  }
  if (healthScore >= 65 && (signal.intelligenceScore ?? 0) >= 40) {
    push("ai_credits", "Actief AI/intelligence gebruik");
  }
  if (signal.wonDealValue >= 15000 || healthScore >= 80) {
    push("enterprise", "Hoge waarde / sterke health — enterprise fit");
  }
  if (signal.openDealValue > 0 && signal.wonDealValue > 0) {
    push("extra_modules", "Parallelle deals — module-uitbreiding");
  }
  if ((signal.intelligenceScore ?? 0) === 0) {
    push("new_integrations", "Nog geen intelligence — integraties activeren");
  }
  if (signal.wonDealValue >= 25000) {
    push("white_label", "Enterprise-omzet — white-label relevant");
    push("api", "Schaalbaarheid via API");
  }
  if (signal.overdueTasks >= 1 || healthScore < 55) {
    push("premium_support", "Support-druk of lagere health");
  }

  return out.slice(0, 6);
}

export function detectCrossSell(
  signal: CustomerSignalInput,
  healthScore: number,
): CrossSellItem[] {
  const out: CrossSellItem[] = [];
  const push = (code: CrossSellProduct, rationale: string) => {
    out.push({ code, label: CROSS_SELL_LABELS[code], rationale });
  };

  const industry = (signal.industry ?? "").toLowerCase();
  push("storataq", "Lead/CRM stack versterken met StorataQ");
  if (/hr|personeel|recruit/i.test(industry) || signal.contactCount >= 5) {
    push("storahr", "Team/HR-uitbreiding");
  }
  if (signal.wonDealValue >= 10000) {
    push("storafinance", "Financiële opvolging bij groeiende omzet");
  }
  if (signal.openTasks + signal.noteCount >= 4) {
    push("storaprojects", "Projectmatige samenwerking");
  }
  if (/logist|transport|retail|wholesale/i.test(industry)) {
    push("storaroute", "Operationele routing / field ops");
  }
  if (healthScore >= 60) {
    push("storainsight", "Analytics & inzichten op stabiele accounts");
  }
  return out.slice(0, 5);
}

export function buildInsights(
  signal: CustomerSignalInput,
  healthScore: number,
  churnProbability: number,
  upsell: UpsellItem[],
): CsInsightBundle {
  const strengths: string[] = [];
  const problems: string[] = [];
  const improvements: string[] = [];
  const risks: string[] = [];
  const opportunities: string[] = [];
  const actions: string[] = [];

  if (healthScore >= 70) strengths.push("Sterke customer health");
  if (signal.wonDealValue > 0) strengths.push("Bewezen omzetrelatie");
  if (signal.daysSinceActivity <= 7) strengths.push("Recente activiteit");

  if (signal.daysSinceActivity >= 21) problems.push("Lage engagement");
  if (signal.overdueTasks > 0) problems.push("Openstaande overdue taken");
  if (signal.billingPastDue) problems.push("Betaalrisico");

  if (churnProbability >= 0.4) risks.push("Verhoogde churnkans");
  if (signal.contractEndsAt) {
    const days = Math.floor(
      (new Date(signal.contractEndsAt).getTime() - Date.now()) /
        (24 * 60 * 60 * 1000),
    );
    if (days <= 60) risks.push("Renewal window actief");
  }

  improvements.push("Verhoog feature adoption", "Plan periodieke success review");
  for (const u of upsell.slice(0, 3)) {
    opportunities.push(u.label);
  }

  if (churnProbability >= 0.45) actions.push("reduce_churn");
  if (signal.daysSinceActivity >= 14) actions.push("call_customer");
  if (upsell.length > 0 && healthScore >= 65) actions.push("upsell_offer");

  return { strengths, problems, improvements, risks, opportunities, actions };
}

export function buildCustomerRecommendations(params: {
  companyId: string;
  companyName: string;
  healthScore: number;
  churnProbability: number;
  onboardingProgress: number;
  upsellCount: number;
  contractEndsAt: string | null;
}): CsRecommendation[] {
  const recs: CsRecommendation[] = [];
  const add = (
    type: CsRecommendationType,
    rationale: string,
    priority: number,
    payload?: Record<string, unknown>,
  ) => {
    recs.push({
      type,
      title: `${CS_RECOMMENDATION_LABELS[type]} — ${params.companyName}`,
      rationale,
      priority,
      companyId: params.companyId,
      payload,
    });
  };

  if (params.churnProbability >= 0.45) {
    add("reduce_churn", `Churn ${(params.churnProbability * 100).toFixed(0)}%`, 92);
    add("call_customer", "Persoonlijk contact verlaagt churnrisico", 88);
  }
  if (params.healthScore < 55) {
    add("offer_support", `Health ${params.healthScore}`, 80);
    add("schedule_training", "Adoption verhogen via training", 74);
  }
  if (params.onboardingProgress < 80) {
    add("complete_onboarding", `Onboarding ${params.onboardingProgress}%`, 78);
    add("send_guide", "Stuur onboarding handleiding", 66);
  }
  if (params.upsellCount > 0 && params.healthScore >= 65) {
    add("upsell_offer", `${params.upsellCount} upsell signalen`, 70);
    add("demo_feature", "Demo nieuwe modules/features", 62);
  }
  if (params.contractEndsAt) {
    const days = Math.floor(
      (new Date(params.contractEndsAt).getTime() - Date.now()) /
        (24 * 60 * 60 * 1000),
    );
    if (days <= 60) {
      add("renewal_talk", `Contract eindigt over ${days} dagen`, 90);
    }
  }
  add("schedule_review", "Periodieke success evaluatie", 55);

  return recs.sort((a, b) => b.priority - a.priority).slice(0, 8);
}

export function buildAlerts(params: {
  companyId: string;
  companyName: string;
  healthScore: number;
  churnProbability: number;
  daysSinceActivity: number;
  overdueTasks: number;
  onboardingProgress: number;
  contractEndsAt: string | null;
  billingPastDue: boolean;
}): CsAlert[] {
  const alerts: CsAlert[] = [];

  if (params.daysSinceActivity >= 30) {
    alerts.push({
      type: "no_login",
      severity: "high",
      title: `Geen activiteit 30+ dagen — ${params.companyName}`,
      message: `${params.daysSinceActivity} dagen sinds laatste activiteit`,
      companyId: params.companyId,
    });
  }
  if (params.overdueTasks >= 2) {
    alerts.push({
      type: "high_support",
      severity: "medium",
      title: `Support-druk — ${params.companyName}`,
      message: `${params.overdueTasks} overdue taken`,
      companyId: params.companyId,
    });
  }
  if (params.healthScore < 45) {
    alerts.push({
      type: "low_health",
      severity: params.healthScore < 30 ? "critical" : "high",
      title: `Lage health score — ${params.companyName}`,
      message: `Score ${params.healthScore}`,
      companyId: params.companyId,
    });
  }
  if (params.contractEndsAt) {
    const days = Math.floor(
      (new Date(params.contractEndsAt).getTime() - Date.now()) /
        (24 * 60 * 60 * 1000),
    );
    if (days <= 45) {
      alerts.push({
        type: "contract_expiring",
        severity: days <= 14 ? "critical" : "high",
        title: `Contract verloopt — ${params.companyName}`,
        message: `${days} dagen resterend`,
        companyId: params.companyId,
      });
    }
  }
  if (params.onboardingProgress < 70 && params.daysSinceActivity >= 21) {
    alerts.push({
      type: "onboarding_incomplete",
      severity: "medium",
      title: `Onboarding niet afgerond — ${params.companyName}`,
      message: `${params.onboardingProgress}% compleet`,
      companyId: params.companyId,
    });
  }
  if (params.billingPastDue) {
    alerts.push({
      type: "payment_risk",
      severity: "high",
      title: `Betaalrisico — ${params.companyName}`,
      message: "Past due / unpaid signaal",
      companyId: params.companyId,
    });
  }
  if (params.churnProbability >= 0.55) {
    alerts.push({
      type: "churn_spike",
      severity: "critical",
      title: `Churn risico — ${params.companyName}`,
      message: `${Math.round(params.churnProbability * 100)}% kans`,
      companyId: params.companyId,
    });
  }
  if (params.healthScore < 60 && params.daysSinceActivity >= 14) {
    alerts.push({
      type: "negative_trend",
      severity: "medium",
      title: `Negatieve trend — ${params.companyName}`,
      message: "Health + activiteit dalen samen",
      companyId: params.companyId,
    });
  }

  return alerts;
}
