/**
 * Marketing automation workflows + lead nurturing plans.
 */

import type { MarketingChannel } from "@/lib/marketing-agent/constants";
import type {
  NurturePlan,
  WorkflowGraph,
  WorkflowNode,
} from "@/lib/marketing-agent/types";

export function buildDefaultNurtureWorkflow(params?: {
  name?: string;
}): WorkflowGraph {
  const nodes: WorkflowNode[] = [
    {
      id: "n1",
      type: "email",
      label: "Welkom e-mail",
      config: { template: "welcome", delayDays: 0 },
    },
    {
      id: "n2",
      type: "wait",
      label: "3 dagen wachten",
      config: { days: 3 },
    },
    {
      id: "n3",
      type: "email",
      label: "Waarde e-mail",
      config: { template: "value", delayDays: 3 },
    },
    {
      id: "n4",
      type: "email",
      label: "Demo uitnodiging",
      config: { template: "demo_invite", delayDays: 6 },
    },
    {
      id: "n5",
      type: "task",
      label: "Sales taak",
      config: { taskType: "follow_up", assignTo: "owner" },
    },
    {
      id: "n6",
      type: "email",
      label: "Follow-up",
      config: { template: "follow_up", delayDays: 9 },
    },
    {
      id: "n7",
      type: "handoff",
      label: "Sales neemt over",
      config: { when: "demo_booked_or_hot_score" },
    },
  ];

  const edges = [
    { from: "n1", to: "n2" },
    { from: "n2", to: "n3" },
    { from: "n3", to: "n4" },
    { from: "n4", to: "n5" },
    { from: "n5", to: "n6" },
    { from: "n6", to: "n7" },
  ];

  void params;
  return { nodes, edges };
}

export function buildNurturePlan(params: {
  leadScore?: number | null;
  channel?: MarketingChannel;
}): NurturePlan {
  const score = params.leadScore ?? 40;
  const channel: MarketingChannel =
    params.channel ?? (score >= 70 ? "multi" : "email");

  if (score >= 70) {
    return {
      contentSequence: [
        "welcome",
        "case_study",
        "demo_invite",
        "sales_handoff",
      ],
      channel,
      frequencyDays: 2,
      stopAfterDays: 14,
      handoffToSalesWhen: "Hot score of demo CTA-klik",
    };
  }
  if (score >= 40) {
    return {
      contentSequence: [
        "welcome",
        "value_email",
        "blog",
        "demo_invite",
        "follow_up",
        "sales_handoff",
      ],
      channel,
      frequencyDays: 3,
      stopAfterDays: 28,
      handoffToSalesWhen: "Engagement (open+click) of score ≥ 70",
    };
  }
  return {
    contentSequence: ["welcome", "newsletter", "re_engagement", "stop_or_nurture"],
    channel: "email",
    frequencyDays: 7,
    stopAfterDays: 45,
    handoffToSalesWhen: "Alleen bij expliciete interesse",
  };
}

export function workflowSummary(graph: WorkflowGraph): string {
  return graph.nodes.map((n) => n.label).join(" → ");
}

export function scoreAutomation(graph: WorkflowGraph): number {
  const hasHandoff = graph.nodes.some((n) => n.type === "handoff");
  const emails = graph.nodes.filter((n) => n.type === "email").length;
  const waits = graph.nodes.filter((n) => n.type === "wait").length;
  return Math.max(
    20,
    Math.min(95, 40 + emails * 8 + waits * 5 + (hasHandoff ? 12 : 0)),
  );
}
