/* eslint-disable @typescript-eslint/no-explicit-any */
import type { EndReason } from "@/lib/email/sequence/constants";
import type { SequenceStep } from "@/lib/email/sequence/steps";
import { evaluateCondition } from "@/lib/email/execution/condition-evaluator";
import type { ConditionEvaluationInput } from "@/lib/email/execution/condition-evaluator";

export type StepResolutionResult = {
  nextStep: SequenceStep | null;
  endReason?: EndReason;
  branchSelected?: "yes" | "no" | "default" | "exit";
};

function sortedByOrder(steps: SequenceStep[]): SequenceStep[] {
  return [...steps].sort((a, b) => a.order - b.order);
}

export function resolveFirstStep(steps: SequenceStep[]): SequenceStep | null {
  const sorted = sortedByOrder(steps);
  if (!sorted.length) return null;
  // Start at the first non-End step. End-only sequences are invalid anyway.
  return sorted.find((s) => s.type !== "end") ?? sorted[0];
}

export function resolveNextStep(input: {
  steps: SequenceStep[];
  currentStep: SequenceStep;
  conditionInput: ConditionEvaluationInput;
  campaignApprovalStatus?: string | null;
}): StepResolutionResult {
  const { steps, currentStep, conditionInput } = input;

  if (currentStep.type === "end") {
    return {
      nextStep: null,
      endReason: (currentStep.endReason ?? "sequence_completed") as EndReason,
    };
  }

  if (currentStep.type === "condition" && currentStep.condition) {
    const evaluation = evaluateCondition(currentStep.condition, conditionInput);
    const cond = currentStep.condition;

    const destId = (() => {
      if (evaluation.matched) {
        return {
          id:
            cond.yesBranchStepId ??
            cond.defaultBranchStepId ??
            cond.exitBranchStepId ??
            null,
          selected: (cond.yesBranchStepId ? "yes" : cond.defaultBranchStepId ? "default" : "exit") as
            | "yes"
            | "default"
            | "exit",
        };
      }

      return {
        id:
          cond.noBranchStepId ??
          cond.defaultBranchStepId ??
          cond.exitBranchStepId ??
          null,
        selected: (cond.noBranchStepId ? "no" : cond.defaultBranchStepId ? "default" : "exit") as
          | "no"
          | "default"
          | "exit",
      };
    })();

    if (!destId.id) {
      return { nextStep: null, branchSelected: destId.selected as any };
    }

    const next = steps.find((s) => s.id === destId.id) ?? null;
    return {
      nextStep: next,
      branchSelected: destId.selected as any,
    };
  }

  // Default: ordered next step.
  const sorted = sortedByOrder(steps);
  const idx = sorted.findIndex((s) => s.id === currentStep.id);
  if (idx === -1) {
    return { nextStep: null };
  }
  return { nextStep: sorted[idx + 1] ?? null };
}

