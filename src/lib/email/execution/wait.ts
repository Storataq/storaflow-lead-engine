/**
 * Wait calculation engine (Phase 21E) — deterministic scheduling only.
 *
 * Note: holiday/provider calendars are intentionally placeholders in this phase.
 */

import type { SequenceStep } from "@/lib/email/sequence/steps";

function delayToMs(step: SequenceStep): number {
  if (step.type !== "wait" || !step.delay) return 0;
  const { value, unit, skipWeekends } = step.delay;

  switch (unit) {
    case "minutes":
      return value * 60_000;
    case "hours":
      return value * 3_600_000;
    case "calendar_days":
      return value * 86_400_000;
    case "business_days": {
      // Keep deterministic and simple: count weekdays as business days.
      // If skipWeekends is false, treat as calendar days.
      if (!skipWeekends) return value * 86_400_000;

      let ms = 0;
      let remaining = value;
      let cursor = new Date();
      while (remaining > 0) {
        const day = cursor.getDay();
        // 0 = Sunday, 6 = Saturday
        if (day !== 0 && day !== 6) {
          remaining -= 1;
          ms += 8 * 3_600_000; // 8h day approximation
        }
        cursor = new Date(cursor.getTime() + 86_400_000);
      }
      return ms;
    }
    default:
      // Placeholder for until_* units.
      return value * 86_400_000;
  }
}

export function calculateWaitDelayMs(step: SequenceStep): number {
  return delayToMs(step);
}

export function calculateScheduledFor(when: Date, step: SequenceStep): Date {
  const ms = calculateWaitDelayMs(step);
  return new Date(when.getTime() + ms);
}

