/**
 * Convert sequence steps ↔ visual workflow graph (layout overlay).
 */

import type { BuilderBlockType } from "@/lib/email/campaign-builder/constants";
import type {
  WorkflowEdge,
  WorkflowGraph,
  WorkflowNode,
} from "@/lib/email/campaign-builder/types";
import type { SequenceStep } from "@/lib/email/sequence/steps";

function stepTypeToBlock(type: SequenceStep["type"]): BuilderBlockType {
  switch (type) {
    case "email":
      return "send_email";
    case "wait":
      return "wait";
    case "condition":
      return "condition";
    case "manual_task":
      return "decision";
    case "end":
      return "end";
    default:
      return "decision";
  }
}

export function emptyWorkflowGraph(): WorkflowGraph {
  return {
    version: 1,
    zoom: 1,
    panX: 0,
    panY: 0,
    nodes: [
      {
        id: "start",
        type: "start",
        label: "Start",
        x: 80,
        y: 160,
      },
    ],
    edges: [],
  };
}

export function graphFromSequenceSteps(
  steps: SequenceStep[],
  existing?: WorkflowGraph | null,
): WorkflowGraph {
  const base = existing ?? emptyWorkflowGraph();
  const sorted = [...steps].sort((a, b) => a.order - b.order);
  const nodes: WorkflowNode[] = [
    {
      id: "start",
      type: "start",
      label: "Start",
      x: 80,
      y: 160,
    },
  ];
  const edges: WorkflowEdge[] = [];

  let prevId = "start";
  sorted.forEach((step, index) => {
    const id = step.id || `step-${index}`;
    const existingNode = base.nodes.find(
      (n) => n.sequenceStepId === step.id || n.id === id,
    );
    nodes.push({
      id,
      type: stepTypeToBlock(step.type),
      label: step.name || step.type,
      x: existingNode?.x ?? 80 + (index + 1) * 220,
      y: existingNode?.y ?? 160 + (index % 2) * 40,
      sequenceStepId: step.id,
      config: {
        stepType: step.type,
        delay: step.delay ?? null,
        condition: step.condition ?? null,
        email: step.email ?? null,
      },
    });
    edges.push({
      id: `e-${prevId}-${id}`,
      source: prevId,
      target: id,
    });
    prevId = id;

    if (step.type === "condition" && step.condition) {
      const yesId = step.condition.yesBranchStepId;
      const noId = step.condition.noBranchStepId;
      if (yesId) {
        edges.push({
          id: `e-${id}-yes-${yesId}`,
          source: id,
          target: yesId,
          label: "Yes",
        });
      }
      if (noId) {
        edges.push({
          id: `e-${id}-no-${noId}`,
          source: id,
          target: noId,
          label: "No",
        });
      }
    }
  });

  return {
    version: 1,
    zoom: base.zoom ?? 1,
    panX: base.panX ?? 0,
    panY: base.panY ?? 0,
    nodes,
    edges,
  };
}

export function parseWorkflowGraph(value: unknown): WorkflowGraph {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptyWorkflowGraph();
  }
  const row = value as Record<string, unknown>;
  const nodes = Array.isArray(row.nodes) ? (row.nodes as WorkflowNode[]) : [];
  const edges = Array.isArray(row.edges) ? (row.edges as WorkflowEdge[]) : [];
  return {
    version: Number(row.version ?? 1),
    zoom: Number(row.zoom ?? 1),
    panX: Number(row.panX ?? 0),
    panY: Number(row.panY ?? 0),
    nodes,
    edges,
  };
}
