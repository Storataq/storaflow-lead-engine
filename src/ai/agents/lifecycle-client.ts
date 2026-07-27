/**
 * Client-safe agent lifecycle transition checks.
 */

import type { AgentLifecycleStatus } from "@/ai/constants";

const ALLOWED_TRANSITIONS: Record<AgentLifecycleStatus, AgentLifecycleStatus[]> =
  {
    created: ["idle", "cancelled"],
    idle: ["planning", "running", "paused", "cancelled"],
    planning: ["waiting", "running", "needs_approval", "failed", "cancelled"],
    waiting: ["running", "needs_approval", "paused", "cancelled", "failed"],
    running: [
      "waiting",
      "needs_approval",
      "paused",
      "retrying",
      "failed",
      "completed",
      "cancelled",
    ],
    needs_approval: ["running", "paused", "cancelled", "failed", "completed"],
    paused: ["idle", "running", "cancelled"],
    retrying: ["running", "failed", "cancelled"],
    failed: ["idle", "retrying", "cancelled"],
    completed: ["idle"],
    cancelled: ["idle"],
  };

export function canTransition(
  from: AgentLifecycleStatus,
  to: AgentLifecycleStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}
