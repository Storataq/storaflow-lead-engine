/**
 * Scheduler interfaces stub — no cron / no send.
 */

import type { EmailScheduler, ScheduleSendRequest, ScheduleSendResult } from "@/lib/email/interfaces";

export const SCHEDULER_MODES = [
  "send_now",
  "future_date",
  "business_hours",
] as const;

export type SchedulerMode = (typeof SCHEDULER_MODES)[number];

/**
 * Foundation scheduler: accepts requests but never executes sends.
 */
export const noopEmailScheduler: EmailScheduler = {
  async schedule(request: ScheduleSendRequest): Promise<ScheduleSendResult> {
    return {
      accepted: false,
      queueItemId: request.queueItemId,
      scheduledAt: request.scheduledAt ?? null,
      message:
        "Email scheduler foundation only — execution is disabled until a later phase.",
    };
  },
  async cancel(): Promise<boolean> {
    return false;
  },
};
