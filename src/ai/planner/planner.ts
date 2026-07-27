/**
 * Deterministic planner — decomposes work into prioritized subtasks.
 */

import type { ExecutionPlan, PlanSubtask } from "@/ai/types";

const TOOL_HINTS: Array<{ pattern: RegExp; tool: string; title: string }> = [
  { pattern: /bedrijf|compan(y|ies)/i, tool: "crm.search_companies", title: "Search companies" },
  { pattern: /contact/i, tool: "crm.search_contacts", title: "Search contacts" },
  { pattern: /deal|pipeline|opportun/i, tool: "crm.search_deals", title: "Search deals" },
  { pattern: /taak|task/i, tool: "crm.list_tasks", title: "List open tasks" },
  { pattern: /kennis|knowledge|faq|policy/i, tool: "knowledge.search", title: "Search knowledge" },
  { pattern: /herinner|memory|onthoud/i, tool: "memory.recall", title: "Recall memory" },
  { pattern: /analyt|rapport|summary|overzicht/i, tool: "analytics.summary", title: "Analytics summary" },
];

export function buildExecutionPlan(input: string): ExecutionPlan {
  const subtasks: PlanSubtask[] = [];
  const parallelGroups: string[] = [];
  let idx = 0;

  for (const hint of TOOL_HINTS) {
    if (!hint.pattern.test(input)) continue;
    idx += 1;
    const id = `t${idx}`;
    const group = "gather";
    if (!parallelGroups.includes(group)) parallelGroups.push(group);
    subtasks.push({
      id,
      title: hint.title,
      priority: 50 + idx,
      dependsOn: [],
      toolName: hint.tool,
      input: { query: input, limit: 10 },
      parallelGroup: group,
    });
  }

  if (subtasks.length === 0) {
    subtasks.push({
      id: "t1",
      title: "Answer with context",
      priority: 100,
      dependsOn: [],
      parallelGroup: "answer",
    });
    parallelGroups.push("answer");
  } else {
    const synthesizeId = `t${subtasks.length + 1}`;
    subtasks.push({
      id: synthesizeId,
      title: "Synthesize answer",
      priority: 200,
      dependsOn: subtasks.map((s) => s.id),
      parallelGroup: "synthesize",
    });
    parallelGroups.push("synthesize");
  }

  return {
    summary: `Plan with ${subtasks.length} step(s) for: ${input.slice(0, 120)}`,
    subtasks,
    parallelGroups,
  };
}

export function topologicalSort(subtasks: PlanSubtask[]): PlanSubtask[] {
  const byId = new Map(subtasks.map((s) => [s.id, s]));
  const visited = new Set<string>();
  const result: PlanSubtask[] = [];

  function visit(id: string) {
    if (visited.has(id)) return;
    visited.add(id);
    const node = byId.get(id);
    if (!node) return;
    for (const dep of node.dependsOn) visit(dep);
    result.push(node);
  }

  const ordered = [...subtasks].sort((a, b) => a.priority - b.priority);
  for (const s of ordered) visit(s.id);
  return result;
}

export function groupParallelReady(
  subtasks: PlanSubtask[],
  completedIds: Set<string>,
): PlanSubtask[] {
  return subtasks.filter(
    (s) =>
      !completedIds.has(s.id) &&
      s.dependsOn.every((d) => completedIds.has(d)),
  );
}
