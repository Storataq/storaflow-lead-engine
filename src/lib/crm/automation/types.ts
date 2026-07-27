import type { AutomationBlockType } from "@/lib/crm/automation/constants";
import type { Database } from "@/types/supabase";

export type CrmAutomationRow =
  Database["public"]["Tables"]["crm_automations"]["Row"];
export type CrmAutomationRunRow =
  Database["public"]["Tables"]["crm_automation_runs"]["Row"];
export type CrmAutomationRunLogRow =
  Database["public"]["Tables"]["crm_automation_run_logs"]["Row"];
export type CrmAutomationVersionRow =
  Database["public"]["Tables"]["crm_automation_versions"]["Row"];

export type AutomationWorkflowNode = {
  id: string;
  type: AutomationBlockType;
  label: string;
  x: number;
  y: number;
  config?: Record<string, unknown>;
};

export type AutomationWorkflowEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
};

export type AutomationWorkflowGraph = {
  version: number;
  zoom: number;
  panX: number;
  panY: number;
  nodes: AutomationWorkflowNode[];
  edges: AutomationWorkflowEdge[];
};

export type AutomationDefinition = {
  conditions?: Array<{
    field: string;
    operator: string;
    value?: string | number | boolean | null;
  }>;
  actions?: string[];
  delays?: Array<{ nodeId: string; amount: number; unit: string }>;
};

export type ExecutedAction = {
  action: string;
  status: "queued" | "simulated" | "skipped" | "failed";
  detail?: string;
};
