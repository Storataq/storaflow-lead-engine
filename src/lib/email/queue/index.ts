/**
 * Queue status helpers — no worker execution in foundation.
 */

import type { EmailQueueStatus } from "@/lib/email/types";

export const EMAIL_QUEUE_STATUSES: readonly EmailQueueStatus[] = [
  "queued",
  "waiting",
  "scheduled",
  "sending",
  "sent",
  "delivered",
  "delayed",
  "opened",
  "clicked",
  "replied",
  "bounced",
  "complained",
  "rejected",
  "failed",
  "cancelled",
] as const;

export const TERMINAL_QUEUE_STATUSES: readonly EmailQueueStatus[] = [
  "delivered",
  "replied",
  "bounced",
  "complained",
  "rejected",
  "failed",
  "cancelled",
] as const;

export function isTerminalQueueStatus(status: EmailQueueStatus): boolean {
  return (TERMINAL_QUEUE_STATUSES as readonly string[]).includes(status);
}

export function canTransitionQueueStatus(
  from: EmailQueueStatus,
  to: EmailQueueStatus,
): boolean {
  if (from === to) return true;
  if (isTerminalQueueStatus(from) && to !== from) return false;
  const order: EmailQueueStatus[] = [
    "queued",
    "waiting",
    "scheduled",
    "sending",
    "sent",
    "delayed",
    "delivered",
    "opened",
    "clicked",
    "replied",
  ];
  const fromIdx = order.indexOf(from);
  const toIdx = order.indexOf(to);
  if (
    to === "failed" ||
    to === "cancelled" ||
    to === "bounced" ||
    to === "complained" ||
    to === "rejected"
  ) {
    return true;
  }
  if (fromIdx === -1 || toIdx === -1) return false;
  return toIdx >= fromIdx;
}
