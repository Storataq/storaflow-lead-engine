/**
 * Approval policy helpers (client-safe).
 */

import type { ApprovalMode } from "@/ai/constants";

export function requiresHumanApproval(
  mode: ApprovalMode,
  actionKind: "read" | "write" | "external",
): boolean {
  switch (mode) {
    case "read_only":
      return actionKind !== "read";
    case "suggest":
      return actionKind !== "read";
    case "approval_required":
      return actionKind !== "read";
    case "semi_autonomous":
      return actionKind === "external";
    case "fully_autonomous":
      return false;
    default:
      return true;
  }
}

export function resolveEffectiveApprovalMode(
  orgMode: string,
  agentMode: string,
): ApprovalMode {
  const order: ApprovalMode[] = [
    "read_only",
    "suggest",
    "approval_required",
    "semi_autonomous",
    "fully_autonomous",
  ];
  const orgIdx = order.indexOf(orgMode as ApprovalMode);
  const agentIdx = order.indexOf(agentMode as ApprovalMode);
  const a = orgIdx >= 0 ? orgIdx : 2;
  const b = agentIdx >= 0 ? agentIdx : 2;
  return order[Math.min(a, b)]!;
}
