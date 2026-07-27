/**
 * Built-in automation templates (system catalog — not DB-dependent).
 */

import {
  AUTOMATION_TRIGGER_LABELS,
  type AutomationTrigger,
} from "@/lib/crm/automation/constants";
import { linearGraphFromActions } from "@/lib/crm/automation/graph";
import type { AutomationWorkflowGraph } from "@/lib/crm/automation/types";

export type AutomationTemplateDef = {
  code: string;
  name: string;
  description: string;
  category: string;
  triggerType: AutomationTrigger;
  graph: AutomationWorkflowGraph;
  aiSuggestion?: string;
};

function hotLeadGraph(): AutomationWorkflowGraph {
  return {
    version: 1,
    zoom: 1,
    panX: 0,
    panY: 0,
    nodes: [
      { id: "start", type: "start", label: "Start", x: 40, y: 140 },
      { id: "t1", type: "trigger", label: "Lead Hot", x: 220, y: 140 },
      { id: "a1", type: "action", label: "Assign Owner", x: 420, y: 140, config: { action: "assign_owner" } },
      { id: "a2", type: "action", label: "Schedule Follow-up", x: 620, y: 140, config: { action: "schedule_call" } },
      { id: "a3", type: "action", label: "Send Welcome Email", x: 820, y: 140, config: { action: "send_email" } },
      { id: "d1", type: "delay", label: "Wait 3 Days", x: 1020, y: 140, config: { amount: 3, unit: "days" } },
      { id: "c1", type: "condition", label: "If No Reply", x: 1220, y: 140, config: { field: "email_status", operator: "eq", value: "no_reply" } },
      { id: "a4", type: "action", label: "Create Task", x: 1420, y: 80, config: { action: "create_task" } },
      { id: "end", type: "end", label: "End", x: 1620, y: 140 },
    ],
    edges: [
      { id: "e1", source: "start", target: "t1" },
      { id: "e2", source: "t1", target: "a1" },
      { id: "e3", source: "a1", target: "a2" },
      { id: "e4", source: "a2", target: "a3" },
      { id: "e5", source: "a3", target: "d1" },
      { id: "e6", source: "d1", target: "c1" },
      { id: "e7", source: "c1", target: "a4", label: "Yes" },
      { id: "e8", source: "c1", target: "end", label: "No" },
      { id: "e9", source: "a4", target: "end" },
    ],
  };
}

export function listSystemAutomationTemplates() {
  return SYSTEM_AUTOMATION_TEMPLATES;
}

export const SYSTEM_AUTOMATION_TEMPLATES: AutomationTemplateDef[] = [
  {
    code: "hot_lead",
    name: "Hot Lead",
    description:
      "Assign sales manager → schedule follow-up → send welcome → wait 3 days → task if no reply.",
    category: "sales",
    triggerType: "lead_became_hot",
    graph: hotLeadGraph(),
    aiSuggestion:
      "High Lead Score → Assign Sales Manager → Schedule Follow-up → Send Welcome Email → Wait 3 Days → If No Reply → Create Task",
  },
  {
    code: "new_company",
    name: "New Company",
    description: "Run AI analysis and refresh lead score when a company is created.",
    category: "enrichment",
    triggerType: "company_created",
    graph: linearGraphFromActions(AUTOMATION_TRIGGER_LABELS.company_created, [
      { type: "action", label: "Run AI Analysis", config: { action: "run_ai_analysis" } },
      { type: "action", label: "Refresh Lead Score", config: { action: "refresh_lead_score" } },
    ]),
  },
  {
    code: "cold_lead",
    name: "Cold Lead",
    description: "Enroll cooling leads into a nurture campaign.",
    category: "nurture",
    triggerType: "lead_score_decreased",
    graph: linearGraphFromActions(AUTOMATION_TRIGGER_LABELS.lead_score_decreased, [
      { type: "condition", label: "Cold?", config: { field: "lead_score", operator: "lt", value: 40 } },
      { type: "action", label: "Enroll Campaign", config: { action: "enroll_campaign" } },
    ]),
  },
  {
    code: "re_engagement",
    name: "Re-engagement",
    description: "Notify and create a task when company health drops.",
    category: "nurture",
    triggerType: "company_health_changed",
    graph: linearGraphFromActions(AUTOMATION_TRIGGER_LABELS.company_health_changed, [
      { type: "action", label: "Notify User", config: { action: "notify_user" } },
      { type: "action", label: "Create Task", config: { action: "create_task" } },
    ]),
  },
  {
    code: "proposal_follow_up",
    name: "Proposal Follow-up",
    description: "Wait two days after stage change, then create a follow-up task.",
    category: "sales",
    triggerType: "pipeline_stage_changed",
    graph: linearGraphFromActions(AUTOMATION_TRIGGER_LABELS.pipeline_stage_changed, [
      { type: "delay", label: "Wait 2 Days", config: { amount: 2, unit: "days" } },
      { type: "action", label: "Create Task", config: { action: "create_task" } },
    ]),
  },
  {
    code: "lost_deal",
    name: "Lost Deal",
    description: "Tag the lead and enroll a win-back campaign.",
    category: "sales",
    triggerType: "deal_lost",
    graph: linearGraphFromActions(AUTOMATION_TRIGGER_LABELS.deal_lost, [
      { type: "action", label: "Update Tag", config: { action: "update_tag" } },
      { type: "action", label: "Enroll Campaign", config: { action: "enroll_campaign" } },
    ]),
  },
  {
    code: "won_deal",
    name: "Won Deal",
    description: "Notify the team and schedule an onboarding meeting.",
    category: "sales",
    triggerType: "deal_won",
    graph: linearGraphFromActions(AUTOMATION_TRIGGER_LABELS.deal_won, [
      { type: "action", label: "Notify User", config: { action: "notify_user" } },
      { type: "action", label: "Schedule Meeting", config: { action: "schedule_meeting" } },
    ]),
  },
  {
    code: "inactive_company",
    name: "Inactive Company",
    description: "Create a research task for inactive businesses.",
    category: "ops",
    triggerType: "company_health_changed",
    graph: linearGraphFromActions(AUTOMATION_TRIGGER_LABELS.company_health_changed, [
      { type: "action", label: "Create Task", config: { action: "create_task" } },
    ]),
  },
  {
    code: "new_decision_maker",
    name: "New Decision Maker",
    description: "Assign owner and schedule a call when a decision maker appears.",
    category: "sales",
    triggerType: "contact_updated",
    graph: linearGraphFromActions(AUTOMATION_TRIGGER_LABELS.contact_updated, [
      { type: "condition", label: "Decision Maker?", config: { field: "decision_maker", operator: "eq", value: true } },
      { type: "action", label: "Assign Owner", config: { action: "assign_owner" } },
      { type: "action", label: "Schedule Call", config: { action: "schedule_call" } },
    ]),
  },
  {
    code: "website_updated",
    name: "Website Updated",
    description: "Refresh AI analysis after a website re-analysis.",
    category: "enrichment",
    triggerType: "website_reanalyzed",
    graph: linearGraphFromActions(AUTOMATION_TRIGGER_LABELS.website_reanalyzed, [
      { type: "action", label: "Run AI Analysis", config: { action: "run_ai_analysis" } },
      { type: "action", label: "Refresh Lead Score", config: { action: "refresh_lead_score" } },
    ]),
  },
];

export function suggestAutomationsFromContext(input: {
  leadScore?: number | null;
  classification?: string | null;
}): AutomationTemplateDef[] {
  const suggestions: AutomationTemplateDef[] = [];
  if (
    input.classification === "hot" ||
    input.classification === "very_hot" ||
    (input.leadScore ?? 0) >= 70
  ) {
    const hot = SYSTEM_AUTOMATION_TEMPLATES.find((t) => t.code === "hot_lead");
    if (hot) suggestions.push(hot);
  }
  if ((input.leadScore ?? 100) < 40) {
    const cold = SYSTEM_AUTOMATION_TEMPLATES.find((t) => t.code === "cold_lead");
    if (cold) suggestions.push(cold);
  }
  if (suggestions.length === 0) {
    return SYSTEM_AUTOMATION_TEMPLATES.slice(0, 3);
  }
  return suggestions;
}
