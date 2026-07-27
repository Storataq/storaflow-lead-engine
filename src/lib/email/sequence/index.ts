/**
 * Sequence engine — Phase 21D public surface.
 * No execution / scheduling / sending.
 */

export {
  EMAIL_SEQUENCE_STATUSES,
  EMAIL_SEQUENCE_STATUS_LABELS,
  EMAIL_SEQUENCE_CATEGORIES,
  EMAIL_SEQUENCE_CATEGORY_LABELS,
  SEQUENCE_STEP_TYPES,
  SEQUENCE_STEP_TYPE_LABELS,
  DEFAULT_SEQUENCE_SAFETY_LIMITS,
  MANDATORY_STOP_RULES,
  JOURNEY_PREVIEW_SCENARIOS,
} from "@/lib/email/sequence/constants";

export type {
  EmailSequenceStatusExtended,
  EmailSequenceCategory,
  SequenceStepType,
  SequenceReadinessClassification,
  JourneyPreviewScenario,
} from "@/lib/email/sequence/constants";

export {
  parseStepsJson,
  stepsToJson,
  sortSequenceSteps,
  renumberSteps,
  createDefaultStep,
  countEmailSteps,
  getStepById,
  type SequenceStep,
  type SequenceDelayConfig,
  type SequenceConditionConfig,
  type SequenceEmailStepConfig,
  type SequenceManualTaskConfig,
} from "@/lib/email/sequence/steps";

export {
  validateSequence,
  compareSequenceVersions,
  type SequenceValidationResult,
  type SequenceValidationIssue,
} from "@/lib/email/sequence/validation";

export {
  previewSequenceTimeline,
  type TimelinePreviewResult,
} from "@/lib/email/sequence/timing";

export {
  previewRecipientJourney,
  type JourneyPreviewResult,
  type JourneyStepPreview,
} from "@/lib/email/sequence/journey";

/** @deprecated Use validateSequence — kept for foundation compatibility */
export function validateSequenceShape(sequence: {
  steps: Array<{
    order: number;
    type: string;
    templateId?: string | null;
    delayHours?: number | null;
  }>;
}): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const steps = [...sequence.steps].sort((a, b) => a.order - b.order);
  if (steps.length === 0) {
    errors.push("Sequence must contain at least one step");
  }
  const orders = new Set<number>();
  for (const step of steps) {
    if (orders.has(step.order)) {
      errors.push(`Duplicate step order: ${step.order}`);
    }
    orders.add(step.order);
    if (step.type === "email" && !step.templateId) {
      errors.push(`Email step ${step.order} requires templateId`);
    }
    if (
      step.type === "wait" &&
      (step.delayHours == null || step.delayHours < 0)
    ) {
      errors.push(`Wait step ${step.order} requires non-negative delay`);
    }
  }
  return { ok: errors.length === 0, errors };
}

export function sortSequenceStepsLegacy<
  T extends { order: number },
>(steps: T[]): T[] {
  return [...steps].sort((a, b) => a.order - b.order);
}
