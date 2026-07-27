/**
 * Grounded executive summary from live metrics (rule-based; not model-generated).
 */

import type {
  ExecutiveAnalyticsBundle,
  GroundedSummary,
} from "@/lib/crm/executive-analytics/types";

type SummaryInput = Pick<
  ExecutiveAnalyticsBundle,
  | "rangeLabel"
  | "kpis"
  | "leadQuality"
  | "campaigns"
  | "automations"
  | "attention"
  | "revenue"
  | "availability"
  | "notices"
>;

export function buildGroundedExecutiveSummary(
  input: SummaryInput,
  generatedAt = new Date().toISOString(),
): GroundedSummary {
  const facts: string[] = [];
  const suggestions: string[] = [];
  const positive: string[] = [];
  const risks: string[] = [];
  const opportunities: string[] = [];
  const actions: string[] = [];
  const unavailableNotes: string[] = [...input.notices];

  const hot =
    input.leadQuality.hotCount + input.leadQuality.veryHotCount;
  facts.push(
    `Analyzed period: ${input.rangeLabel}. Scored leads: ${input.leadQuality.scoredCount}; hot/very hot: ${hot}.`,
  );

  if (input.leadQuality.averageScore != null) {
    facts.push(
      `Average AI lead score: ${input.leadQuality.averageScore}.`,
    );
    if (input.leadQuality.averageScore >= 60) {
      positive.push("Average lead quality is relatively strong in this period.");
    } else if (input.leadQuality.averageScore < 40) {
      risks.push("Average lead score is low — enrichment and scoring gaps may apply.");
    }
  } else {
    unavailableNotes.push(
      "Lead score averages unavailable — run AI lead scoring to populate.",
    );
  }

  if (input.campaigns.sent > 0) {
    facts.push(
      `Emails sent: ${input.campaigns.sent}; replies: ${input.campaigns.replied}.`,
    );
    if (input.campaigns.replyRate != null && input.campaigns.replyRate >= 5) {
      positive.push(`Reply rate is ${input.campaigns.replyRate}% for tracked sends.`);
    } else if (input.campaigns.replyRate != null && input.campaigns.replyRate < 2) {
      risks.push("Campaign reply rate is low relative to sends in this period.");
      suggestions.push(
        "Review audiences without decision makers before the next send.",
      );
    }
  } else {
    unavailableNotes.push(
      "No campaign sends in this period — campaign KPIs are empty, not zero-inflated.",
    );
  }

  if (input.automations.failedToday > 0) {
    risks.push(
      `${input.automations.failedToday} automation execution(s) failed today.`,
    );
    actions.push("Inspect failed automations under CRM → Automations.");
  }
  if (
    input.automations.successRate != null &&
    input.automations.successRate >= 90
  ) {
    positive.push(
      `Automation success rate today is ${input.automations.successRate}%.`,
    );
  }

  if (input.revenue.multiCurrency) {
    unavailableNotes.push(
      "Multiple deal currencies present — revenue figures are grouped by currency; no FX conversion applied.",
    );
  } else if (input.revenue.pipelineByCurrency[0]) {
    const bucket = input.revenue.pipelineByCurrency[0];
    facts.push(
      `Open pipeline (${bucket.currency}): ${bucket.total} across ${input.revenue.openDeals} open deal(s).`,
    );
  }

  const critical = input.attention.filter((a) => a.priority === "critical");
  if (critical.length) {
    risks.push(
      `${critical.length} critical attention item(s): ${critical.map((c) => c.title).join("; ")}.`,
    );
  }

  if (hot > 0) {
    opportunities.push(`Follow up with ${hot} hot/very hot lead(s).`);
    actions.push("Open AI Lead Scoring and filter Hot / Very Hot.");
  }

  if (input.attention.some((a) => a.id === "overdue_tasks")) {
    actions.push("Clear overdue tasks to protect sales cycle velocity.");
  }

  for (const [key, status] of Object.entries(input.availability)) {
    if (status === "unavailable") {
      unavailableNotes.push(`Data source “${key}” is unavailable.`);
    }
  }

  const mainDevelopments = [
    ...facts.slice(0, 3),
    ...(positive[0] ? [positive[0]] : []),
    ...(risks[0] ? [risks[0]] : []),
  ];

  if (actions.length === 0) {
    suggestions.push(
      "Keep enriching companies and scoring leads to improve executive coverage.",
    );
  }

  return {
    periodLabel: input.rangeLabel,
    generatedAt,
    mainDevelopments,
    positiveSignals: positive,
    risks,
    opportunities,
    recommendedActions: actions.length ? actions : suggestions.slice(0, 3),
    facts,
    suggestions,
    unavailableNotes: [...new Set(unavailableNotes)],
    isModelGenerated: false,
  };
}
