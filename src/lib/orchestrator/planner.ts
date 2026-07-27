/**
 * Goal planner — intent recognition, subtasks, dependencies, parallel groups.
 */

import {
  COLLABORATING_AGENTS,
  GOAL_INTENTS,
  type GoalIntent,
} from "@/lib/orchestrator/constants";
import type { PlanStep } from "@/lib/orchestrator/types";

const INTENT_PATTERNS: Array<{ intent: GoalIntent; patterns: RegExp[] }> = [
  {
    intent: "prospecting",
    patterns: [
      /zoek.*bedrijven/i,
      /prospect/i,
      /leads?/i,
      /duitsland|germany|nederland|belgi[eë]/i,
      /interessante bedrijven/i,
    ],
  },
  {
    intent: "pipeline_analysis",
    patterns: [/pipeline/i, /deals?\s+analys/i, /sales\s+pipeline/i],
  },
  {
    intent: "meeting_prep",
    patterns: [/afspraken?\s+voor/i, /meeting\s*prep/i, /bereid.*afspraak/i],
  },
  {
    intent: "marketing_campaign",
    patterns: [/marketing\s*campagne/i, /campagne/i, /campaign/i],
  },
  {
    intent: "revenue_forecast",
    patterns: [/voorspel.*omzet/i, /forecast/i, /\bmrr\b/i, /\barr\b/i, /omzet/i],
  },
  {
    intent: "upsell",
    patterns: [/upsell/i, /cross[- ]?sell/i, /expansie/i],
  },
  {
    intent: "competitor_research",
    patterns: [/concurrent/i, /competitor/i, /onderzoek/i, /research/i],
  },
  {
    intent: "executive_report",
    patterns: [/executive\s*rapport/i, /board\s*report/i, /management\s*rapport/i],
  },
  {
    intent: "customer_success",
    patterns: [/customer\s*success/i, /churn/i, /renewal/i, /onboarding/i],
  },
];

export function detectGoalIntent(goalText: string): GoalIntent {
  for (const entry of INTENT_PATTERNS) {
    if (entry.patterns.some((p) => p.test(goalText))) return entry.intent;
  }
  return "general";
}

export function selectAgentsForIntent(intent: GoalIntent): string[] {
  const map: Record<GoalIntent, string[]> = {
    prospecting: [
      "storaflow-prospecting-agent",
      "storaflow-kernel-assistant",
    ],
    pipeline_analysis: [
      "storaflow-sales-agent",
      "storaflow-revenue-intelligence-agent",
    ],
    meeting_prep: [
      "storaflow-sales-agent",
      "storaflow-kernel-assistant",
    ],
    marketing_campaign: [
      "storaflow-marketing-agent",
      "storaflow-prospecting-agent",
    ],
    revenue_forecast: [
      "storaflow-revenue-intelligence-agent",
      "storaflow-sales-agent",
    ],
    upsell: [
      "storaflow-customer-success-agent",
      "storaflow-revenue-intelligence-agent",
    ],
    competitor_research: [
      "storaflow-prospecting-agent",
      "storaflow-kernel-assistant",
    ],
    executive_report: [
      "storaflow-revenue-intelligence-agent",
      "storaflow-sales-agent",
      "storaflow-customer-success-agent",
      "storaflow-kernel-assistant",
    ],
    customer_success: [
      "storaflow-customer-success-agent",
      "storaflow-revenue-intelligence-agent",
    ],
    general: ["storaflow-kernel-assistant"],
  };
  return map[intent] ?? map.general;
}

function agentLabel(slug: string): string {
  return (
    COLLABORATING_AGENTS.find((a) => a.slug === slug)?.label ?? slug
  );
}

/**
 * Build an executable plan with dependencies and parallel groups.
 * Groups with the same parallelGroup can run concurrently after deps clear.
 */
export function buildGoalPlan(params: {
  goalText: string;
  intent?: GoalIntent;
}): {
  intent: GoalIntent;
  steps: PlanStep[];
  parallelGroups: number[][];
  estimatedCostUsd: number;
  estimatedDurationMs: number;
} {
  const intent =
    params.intent && GOAL_INTENTS.includes(params.intent)
      ? params.intent
      : detectGoalIntent(params.goalText);
  const agents = selectAgentsForIntent(intent);
  const steps: PlanStep[] = [];

  // Fan-out: first agent sequential entry, middle agents may parallel, last merges.
  if (agents.length === 1) {
    steps.push({
      stepKey: "step-1",
      agentSlug: agents[0],
      title: `${agentLabel(agents[0])}: ${intent}`,
      dependsOn: [],
      parallelGroup: 0,
      approvalRequired: false,
      estimatedCostUsd: 0.02,
      estimatedDurationMs: 2500,
    });
  } else if (agents.length === 2) {
    steps.push({
      stepKey: "step-1",
      agentSlug: agents[0],
      title: `${agentLabel(agents[0])}: analyse`,
      dependsOn: [],
      parallelGroup: 0,
      approvalRequired: false,
      estimatedCostUsd: 0.03,
      estimatedDurationMs: 3000,
    });
    steps.push({
      stepKey: "step-2",
      agentSlug: agents[1],
      title: `${agentLabel(agents[1])}: verrijk & rapporteer`,
      dependsOn: ["step-1"],
      parallelGroup: 1,
      approvalRequired: intent === "executive_report",
      estimatedCostUsd: 0.04,
      estimatedDurationMs: 3500,
    });
  } else {
    // First step entry
    steps.push({
      stepKey: "step-1",
      agentSlug: agents[0],
      title: `${agentLabel(agents[0])}: intake`,
      dependsOn: [],
      parallelGroup: 0,
      approvalRequired: false,
      estimatedCostUsd: 0.02,
      estimatedDurationMs: 2000,
    });
    // Parallel specialists
    const mid = agents.slice(1, -1);
    mid.forEach((slug, i) => {
      steps.push({
        stepKey: `step-${i + 2}`,
        agentSlug: slug,
        title: `${agentLabel(slug)}: parallel analyse`,
        dependsOn: ["step-1"],
        parallelGroup: 1,
        approvalRequired: false,
        estimatedCostUsd: 0.035,
        estimatedDurationMs: 4000,
      });
    });
    const last = agents[agents.length - 1];
    const midKeys = mid.map((_, i) => `step-${i + 2}`);
    steps.push({
      stepKey: `step-${agents.length}`,
      agentSlug: last,
      title: `${agentLabel(last)}: merge & executive summary`,
      dependsOn: midKeys.length ? midKeys : ["step-1"],
      parallelGroup: 2,
      approvalRequired: true,
      estimatedCostUsd: 0.05,
      estimatedDurationMs: 3000,
    });
  }

  const groupMap = new Map<number, string[]>();
  for (const s of steps) {
    const list = groupMap.get(s.parallelGroup) ?? [];
    list.push(s.stepKey);
    groupMap.set(s.parallelGroup, list);
  }
  const parallelGroups = [...groupMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, keys]) => keys.map((k) => steps.findIndex((s) => s.stepKey === k)));

  const estimatedCostUsd =
    Math.round(steps.reduce((s, x) => s + x.estimatedCostUsd, 0) * 10000) /
    10000;
  // Parallel groups share wall-clock; sum max per group
  const byGroup = new Map<number, number>();
  for (const s of steps) {
    byGroup.set(
      s.parallelGroup,
      Math.max(byGroup.get(s.parallelGroup) ?? 0, s.estimatedDurationMs),
    );
  }
  const estimatedDurationMs = [...byGroup.values()].reduce((a, b) => a + b, 0);

  return {
    intent,
    steps,
    parallelGroups,
    estimatedCostUsd,
    estimatedDurationMs,
  };
}
