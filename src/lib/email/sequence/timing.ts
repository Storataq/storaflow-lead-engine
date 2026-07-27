/**
 * Sequence timing preview (deterministic, no scheduling).
 */

import type { SequenceStep } from "@/lib/email/sequence/steps";

export type TimelinePreviewEntry = {
  stepId: string;
  stepName: string;
  stepType: string;
  order: number;
  delayBeforeMs: number;
  delayLabel: string;
  approximateAt: string;
  isPreview: true;
};

export type TimelinePreviewResult = {
  startAt: string;
  timezone: string;
  entries: TimelinePreviewEntry[];
  earliestCompletion: string;
  longestBranchDays: number;
  disclaimer: string;
};

function delayToMs(step: SequenceStep): number {
  if (step.type !== "wait" || !step.delay) return 0;
  const { value, unit } = step.delay;
  switch (unit) {
    case "minutes":
      return value * 60_000;
    case "hours":
      return value * 3_600_000;
    case "calendar_days":
      return value * 86_400_000;
    case "business_days": {
      let ms = 0;
      let remaining = value;
      let cursor = new Date();
      while (remaining > 0) {
        const day = cursor.getDay();
        if (day !== 0 && day !== 6) {
          remaining -= 1;
          ms += 8 * 3_600_000;
        }
        cursor = new Date(cursor.getTime() + 86_400_000);
      }
      return ms;
    }
    default:
      return value * 86_400_000;
  }
}

function formatDelay(step: SequenceStep): string {
  if (step.type !== "wait" || !step.delay) return "—";
  const { value, unit } = step.delay;
  return `${value} ${unit.replace(/_/g, " ")}`;
}

export function previewSequenceTimeline(input: {
  steps: SequenceStep[];
  startAt?: Date;
  timezone?: string;
}): TimelinePreviewResult {
  const start = input.startAt ?? new Date();
  const timezone = input.timezone ?? "UTC";
  const sorted = [...input.steps].sort((a, b) => a.order - b.order);
  const entries: TimelinePreviewEntry[] = [];
  let cursor = start.getTime();
  let totalDelayMs = 0;

  for (const step of sorted) {
    const delayMs = delayToMs(step);
    cursor += delayMs;
    totalDelayMs += delayMs;
    entries.push({
      stepId: step.id,
      stepName: step.name,
      stepType: step.type,
      order: step.order,
      delayBeforeMs: delayMs,
      delayLabel: formatDelay(step),
      approximateAt: new Date(cursor).toISOString(),
      isPreview: true,
    });
  }

  return {
    startAt: start.toISOString(),
    timezone,
    entries,
    earliestCompletion: new Date(cursor).toISOString(),
    longestBranchDays: Math.ceil(totalDelayMs / 86_400_000),
    disclaimer:
      "Preview only — business-day and branch adjustments are approximate. No jobs scheduled.",
  };
}
