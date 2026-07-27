/**
 * Sequence step model + ordering helpers (Phase 21D).
 */

import type { Json } from "@/types/supabase";
import type {
  ConditionOperator,
  DelayUnit,
  EndReason,
  SequenceStepType,
} from "@/lib/email/sequence/constants";

export type SequenceDelayConfig = {
  value: number;
  unit: DelayUnit;
  skipWeekends?: boolean;
  businessHoursOnly?: boolean;
  timezone?: string;
};

export type SequenceConditionConfig = {
  field: string;
  operator: ConditionOperator;
  value?: string | number | string[] | null;
  yesBranchStepId?: string | null;
  noBranchStepId?: string | null;
  defaultBranchStepId?: string | null;
  exitBranchStepId?: string | null;
};

export type SequenceManualTaskConfig = {
  taskType: string;
  title: string;
  description?: string;
  priority?: string;
  dueOffsetHours?: number;
  ownerStrategy?: string;
  blocking?: boolean;
};

export type SequenceEmailStepConfig = {
  templateId?: string | null;
  templateVersionId?: string | null;
  subjectSnapshot?: string | null;
  htmlSnapshot?: string | null;
  textSnapshot?: string | null;
  previewSnapshot?: string | null;
  senderProfileId?: string | null;
  replyToEmail?: string | null;
  language?: string | null;
  requiredVariables?: string[];
  trackingPreference?: string;
  stopOnReply?: boolean;
};

export type SequenceStep = {
  id: string;
  order: number;
  name: string;
  description?: string | null;
  type: SequenceStepType;
  status?: string;
  email?: SequenceEmailStepConfig;
  delay?: SequenceDelayConfig;
  condition?: SequenceConditionConfig;
  task?: SequenceManualTaskConfig;
  endReason?: EndReason;
  endNotes?: string | null;
};

export function parseStepsJson(value: Json | unknown): SequenceStep[] {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : [];
  const steps: SequenceStep[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const type = String(row.type ?? "email") as SequenceStepType;
    const step: SequenceStep = {
      id: String(row.id ?? crypto.randomUUID()),
      order: Number(row.order ?? steps.length + 1),
      name: String(row.name ?? `Step ${steps.length + 1}`),
      description: row.description != null ? String(row.description) : null,
      type,
      status: row.status != null ? String(row.status) : "active",
    };
    if (row.email && typeof row.email === "object") {
      step.email = row.email as SequenceEmailStepConfig;
    }
    if (row.delay && typeof row.delay === "object") {
      step.delay = row.delay as SequenceDelayConfig;
    }
    if (row.condition && typeof row.condition === "object") {
      step.condition = row.condition as SequenceConditionConfig;
    }
    if (row.task && typeof row.task === "object") {
      step.task = row.task as SequenceManualTaskConfig;
    }
    if (row.endReason) step.endReason = String(row.endReason) as EndReason;
    if (row.endNotes != null) step.endNotes = String(row.endNotes);
    steps.push(step);
  }
  return sortSequenceSteps(steps);
}

export function stepsToJson(steps: SequenceStep[]): Json {
  return steps as unknown as Json;
}

export function sortSequenceSteps(steps: SequenceStep[]): SequenceStep[] {
  return [...steps].sort((a, b) => a.order - b.order);
}

export function renumberSteps(steps: SequenceStep[]): SequenceStep[] {
  return sortSequenceSteps(steps).map((step, index) => ({
    ...step,
    order: index + 1,
  }));
}

export function createDefaultStep(
  type: SequenceStepType,
  order: number,
): SequenceStep {
  const id = crypto.randomUUID();
  const base: SequenceStep = {
    id,
    order,
    name:
      type === "end"
        ? "End"
        : type === "wait"
          ? "Wait"
          : type === "condition"
            ? "Condition"
            : type === "manual_task"
              ? "Manual task"
              : "Email",
    type,
  };
  if (type === "email") {
    base.email = { requiredVariables: [], stopOnReply: true };
  }
  if (type === "wait") {
    base.delay = { value: 1, unit: "business_days", skipWeekends: true };
  }
  if (type === "condition") {
    base.condition = {
      field: "recipient_replied",
      operator: "equals",
      value: "false",
    };
  }
  if (type === "manual_task") {
    base.task = {
      taskType: "review_lead",
      title: "Review lead",
      priority: "medium",
      dueOffsetHours: 24,
    };
  }
  if (type === "end") {
    base.endReason = "sequence_completed";
  }
  return base;
}

export function countEmailSteps(steps: SequenceStep[]): number {
  return steps.filter((s) => s.type === "email").length;
}

export function getStepById(
  steps: SequenceStep[],
  stepId: string | null | undefined,
): SequenceStep | undefined {
  if (!stepId) return undefined;
  return steps.find((s) => s.id === stepId);
}
