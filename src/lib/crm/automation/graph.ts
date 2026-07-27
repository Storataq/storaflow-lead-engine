import type { AutomationBlockType } from "@/lib/crm/automation/constants";
import type {
  AutomationWorkflowGraph,
  AutomationWorkflowNode,
} from "@/lib/crm/automation/types";

export function emptyAutomationGraph(): AutomationWorkflowGraph {
  return {
    version: 1,
    zoom: 1,
    panX: 0,
    panY: 0,
    nodes: [
      { id: "start", type: "start", label: "Start", x: 60, y: 140 },
    ],
    edges: [],
  };
}

export function parseAutomationGraph(value: unknown): AutomationWorkflowGraph {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptyAutomationGraph();
  }
  const row = value as Record<string, unknown>;
  const nodes = Array.isArray(row.nodes)
    ? (row.nodes as AutomationWorkflowNode[])
    : [];
  const edges = Array.isArray(row.edges)
    ? (row.edges as AutomationWorkflowGraph["edges"])
    : [];
  return {
    version: Number(row.version ?? 1),
    zoom: Number(row.zoom ?? 1),
    panX: Number(row.panX ?? 0),
    panY: Number(row.panY ?? 0),
    nodes: nodes.length ? nodes : emptyAutomationGraph().nodes,
    edges,
  };
}

export function linearGraphFromActions(
  triggerLabel: string,
  actions: Array<{ type: AutomationBlockType; label: string; config?: Record<string, unknown> }>,
): AutomationWorkflowGraph {
  const graph = emptyAutomationGraph();
  const triggerId = "trigger-1";
  graph.nodes.push({
    id: triggerId,
    type: "trigger",
    label: triggerLabel,
    x: 240,
    y: 140,
  });
  graph.edges.push({ id: "e-start", source: "start", target: triggerId });
  let prev = triggerId;
  actions.forEach((action, index) => {
    const id = `n-${index}`;
    graph.nodes.push({
      id,
      type: action.type,
      label: action.label,
      x: 440 + index * 200,
      y: 140,
      config: action.config ?? {},
    });
    graph.edges.push({ id: `e-${prev}-${id}`, source: prev, target: id });
    prev = id;
  });
  const endId = "end";
  graph.nodes.push({ id: endId, type: "end", label: "End", x: 440 + actions.length * 200, y: 140 });
  graph.edges.push({ id: `e-${prev}-end`, source: prev, target: endId });
  return graph;
}
