/**
 * Sequence validation engine + readiness score (Phase 21D).
 */

import {
  DEFAULT_SEQUENCE_SAFETY_LIMITS,
  MANDATORY_STOP_RULES,
  type SequenceReadinessClassification,
} from "@/lib/email/sequence/constants";
import {
  countEmailSteps,
  getStepById,
  type SequenceStep,
} from "@/lib/email/sequence/steps";

export type SequenceValidationSeverity = "info" | "warning" | "blocking";

export type SequenceValidationIssue = {
  code: string;
  severity: SequenceValidationSeverity;
  message: string;
  stepId?: string;
  field?: string;
};

export type SequenceValidationResult = {
  ok: boolean;
  issues: SequenceValidationIssue[];
  readinessScore: number;
  classification: SequenceReadinessClassification;
  recommendations: string[];
  summary: {
    blockingCount: number;
    warningCount: number;
    infoCount: number;
    stepCount: number;
    emailStepCount: number;
    estimatedDurationDays: number;
  };
};

export type SequenceValidationRequest = {
  name: string;
  status: string;
  steps: SequenceStep[];
  stopRules?: string[];
  safetyLimits?: Partial<typeof DEFAULT_SEQUENCE_SAFETY_LIMITS>;
  templateStatuses?: Record<string, string>;
  senderStatuses?: Record<string, string>;
  personalizationMissingCount?: number;
  isActive?: boolean;
};

function classify(
  score: number,
  blocking: number,
  isActive: boolean,
): SequenceReadinessClassification {
  if (isActive) return "active";
  if (blocking > 0 || score < 40) return "not_ready";
  if (score < 70) return "needs_work";
  if (score < 90) return "ready_with_warnings";
  return "ready";
}

function estimateDurationDays(steps: SequenceStep[]): number {
  let totalHours = 0;
  for (const step of steps) {
    if (step.type !== "wait" || !step.delay) continue;
    const { value, unit } = step.delay;
    switch (unit) {
      case "minutes":
        totalHours += value / 60;
        break;
      case "hours":
        totalHours += value;
        break;
      case "calendar_days":
        totalHours += value * 24;
        break;
      case "business_days":
        totalHours += value * 8;
        break;
      default:
        totalHours += value * 24;
    }
  }
  return Math.ceil(totalHours / 24);
}

function detectUnreachable(steps: SequenceStep[]): string[] {
  if (steps.length === 0) return [];
  const ids = new Set(steps.map((s) => s.id));
  const reachable = new Set<string>();
  const sorted = [...steps].sort((a, b) => a.order - b.order);
  const start = sorted[0];
  if (!start) return [];

  const queue = [start.id];
  while (queue.length) {
    const id = queue.shift()!;
    if (reachable.has(id)) continue;
    reachable.add(id);
    const step = getStepById(steps, id);
    if (!step) continue;

    const nextByOrder = sorted.find((s) => s.order === step.order + 1);
    if (nextByOrder && step.type !== "condition" && step.type !== "end") {
      queue.push(nextByOrder.id);
    }

    if (step.type === "condition" && step.condition) {
      for (const branchId of [
        step.condition.yesBranchStepId,
        step.condition.noBranchStepId,
        step.condition.defaultBranchStepId,
        step.condition.exitBranchStepId,
      ]) {
        if (branchId && ids.has(branchId)) queue.push(branchId);
      }
    }
  }

  return steps.filter((s) => !reachable.has(s.id)).map((s) => s.id);
}

function detectCircularBranches(steps: SequenceStep[]): boolean {
  const graph = new Map<string, string[]>();
  for (const step of steps) {
    const targets: string[] = [];
    const next = steps.find((s) => s.order === step.order + 1);
    if (next && step.type !== "condition" && step.type !== "end") {
      targets.push(next.id);
    }
    if (step.type === "condition" && step.condition) {
      for (const id of [
        step.condition.yesBranchStepId,
        step.condition.noBranchStepId,
        step.condition.defaultBranchStepId,
      ]) {
        if (id) targets.push(id);
      }
    }
    graph.set(step.id, targets);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  function dfs(node: string): boolean {
    if (visiting.has(node)) return true;
    if (visited.has(node)) return false;
    visiting.add(node);
    for (const next of graph.get(node) ?? []) {
      if (dfs(next)) return true;
    }
    visiting.delete(node);
    visited.add(node);
    return false;
  }

  for (const step of steps) {
    if (dfs(step.id)) return true;
  }
  return false;
}

export function validateSequence(
  request: SequenceValidationRequest,
): SequenceValidationResult {
  const issues: SequenceValidationIssue[] = [];
  const recommendations: string[] = [];
  const limits = { ...DEFAULT_SEQUENCE_SAFETY_LIMITS, ...request.safetyLimits };
  const steps = [...request.steps].sort((a, b) => a.order - b.order);

  if (!request.name.trim()) {
    issues.push({
      code: "name_required",
      severity: "blocking",
      message: "Sequence name is required",
    });
  }

  if (steps.length === 0) {
    issues.push({
      code: "no_steps",
      severity: "blocking",
      message: "Sequence must contain at least one step",
    });
  }

  if (steps.length > limits.maxSteps) {
    issues.push({
      code: "max_steps",
      severity: "blocking",
      message: `Sequence exceeds max steps (${limits.maxSteps})`,
    });
  }

  const emailCount = countEmailSteps(steps);
  if (emailCount === 0) {
    issues.push({
      code: "no_email_steps",
      severity: "blocking",
      message: "Sequence must include at least one Email or Manual Task step",
    });
  }

  const endSteps = steps.filter((s) => s.type === "end");
  if (endSteps.length === 0) {
    issues.push({
      code: "no_end_step",
      severity: "blocking",
      message: "Sequence must include at least one End step",
    });
  }

  const orders = new Set<number>();
  for (const step of steps) {
    if (orders.has(step.order)) {
      issues.push({
        code: "duplicate_order",
        severity: "blocking",
        message: `Duplicate step number: ${step.order}`,
        stepId: step.id,
      });
    }
    orders.add(step.order);

    if (step.type === "email") {
      if (!step.email?.templateId) {
        issues.push({
          code: "missing_template",
          severity: "blocking",
          message: `Email step "${step.name}" requires a template`,
          stepId: step.id,
        });
      } else {
        const tplStatus = request.templateStatuses?.[step.email.templateId];
        if (tplStatus === "archived" || tplStatus === "deprecated") {
          issues.push({
            code: "archived_template",
            severity: "blocking",
            message: `Template for step "${step.name}" is archived/deprecated`,
            stepId: step.id,
          });
        }
      }
      if (step.email?.senderProfileId) {
        const senderStatus =
          request.senderStatuses?.[step.email.senderProfileId];
        if (senderStatus === "invalid" || senderStatus === "disabled") {
          issues.push({
            code: "invalid_sender",
            severity: "blocking",
            message: `Invalid sender profile on step "${step.name}"`,
            stepId: step.id,
          });
        }
      }
    }

    if (step.type === "wait") {
      const val = step.delay?.value ?? -1;
      if (val < 0) {
        issues.push({
          code: "negative_delay",
          severity: "blocking",
          message: `Wait step "${step.name}" has invalid delay`,
          stepId: step.id,
        });
      }
    }

    if (step.type === "condition" && step.condition) {
      const { yesBranchStepId, noBranchStepId } = step.condition;
      if (!yesBranchStepId && !noBranchStepId) {
        issues.push({
          code: "missing_branch",
          severity: "blocking",
          message: `Condition step "${step.name}" needs branch destinations`,
          stepId: step.id,
        });
      }
      for (const branchId of [yesBranchStepId, noBranchStepId]) {
        if (branchId && !getStepById(steps, branchId)) {
          issues.push({
            code: "invalid_branch",
            severity: "blocking",
            message: `Condition step "${step.name}" references missing step`,
            stepId: step.id,
          });
        }
      }
    }
  }

  // Consecutive zero-delay emails
  for (let i = 1; i < steps.length; i++) {
    const prev = steps[i - 1];
    const curr = steps[i];
    if (
      prev?.type === "email" &&
      curr?.type === "email" &&
      (!steps[i - 2] || steps[i - 2]?.type !== "wait")
    ) {
      issues.push({
        code: "consecutive_emails",
        severity: "warning",
        message: `Consecutive email steps without wait (${prev.name} → ${curr.name})`,
        stepId: curr.id,
      });
    }
  }

  if (detectCircularBranches(steps)) {
    issues.push({
      code: "circular_branch",
      severity: "blocking",
      message: "Circular branch reference detected",
    });
  }

  const unreachable = detectUnreachable(steps);
  for (const stepId of unreachable) {
    const step = getStepById(steps, stepId);
    issues.push({
      code: "unreachable_step",
      severity: "warning",
      message: `Step "${step?.name ?? stepId}" may be unreachable`,
      stepId,
    });
  }

  const durationDays = estimateDurationDays(steps);
  if (durationDays > limits.maxDurationDays) {
    issues.push({
      code: "max_duration",
      severity: "warning",
      message: `Estimated duration (${durationDays}d) exceeds limit (${limits.maxDurationDays}d)`,
    });
  }

  if (emailCount > limits.maxEmailSteps) {
    issues.push({
      code: "max_email_steps",
      severity: "blocking",
      message: `Too many email steps (${emailCount} > ${limits.maxEmailSteps})`,
    });
  }

  const stopRules = request.stopRules ?? [];
  for (const mandatory of MANDATORY_STOP_RULES) {
    if (!stopRules.includes(mandatory)) {
      issues.push({
        code: "mandatory_stop_rule",
        severity: "warning",
        message: `Recommended stop rule missing: ${mandatory}`,
      });
      recommendations.push(`Add stop rule: ${mandatory}`);
    }
  }

  if ((request.personalizationMissingCount ?? 0) > 0) {
    issues.push({
      code: "personalization_missing",
      severity: "blocking",
      message: `${request.personalizationMissingCount} recipient(s) missing required personalization`,
    });
  }

  const blocking = issues.filter((i) => i.severity === "blocking");
  const warnings = issues.filter((i) => i.severity === "warning");
  const infos = issues.filter((i) => i.severity === "info");

  let score = 100;
  score -= blocking.length * 15;
  score -= warnings.length * 5;
  if (endSteps.length > 0) score += 5;
  if (emailCount > 0 && blocking.length === 0) score += 5;
  score = Math.max(0, Math.min(100, score));

  const classification = classify(
    score,
    blocking.length,
    request.isActive ?? request.status === "active",
  );

  if (blocking.length === 0 && score >= 70) {
    recommendations.push("Sequence can be published (no execution yet).");
  }

  return {
    ok: blocking.length === 0,
    issues,
    readinessScore: score,
    classification,
    recommendations,
    summary: {
      blockingCount: blocking.length,
      warningCount: warnings.length,
      infoCount: infos.length,
      stepCount: steps.length,
      emailStepCount: emailCount,
      estimatedDurationDays: durationDays,
    },
  };
}

/** Compare two step arrays for version diff UI. */
export function compareSequenceVersions(
  before: SequenceStep[],
  after: SequenceStep[],
) {
  const beforeIds = new Set(before.map((s) => s.id));
  const afterIds = new Set(after.map((s) => s.id));
  const added = after.filter((s) => !beforeIds.has(s.id));
  const removed = before.filter((s) => !afterIds.has(s.id));
  const reordered =
    before.length === after.length &&
    before.some((s, i) => after[i]?.id !== s.id);
  const changed: Array<{ stepId: string; fields: string[] }> = [];
  for (const step of after) {
    const prev = before.find((s) => s.id === step.id);
    if (!prev) continue;
    const fields: string[] = [];
    if (prev.name !== step.name) fields.push("name");
    if (prev.type !== step.type) fields.push("type");
    if (JSON.stringify(prev.email) !== JSON.stringify(step.email)) {
      fields.push("email");
    }
    if (JSON.stringify(prev.delay) !== JSON.stringify(step.delay)) {
      fields.push("delay");
    }
    if (JSON.stringify(prev.condition) !== JSON.stringify(step.condition)) {
      fields.push("condition");
    }
    if (fields.length) changed.push({ stepId: step.id, fields });
  }
  return { added, removed, reordered, changed };
}
