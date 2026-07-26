/**
 * Follow-up task suggestions for funnel activation (dedupe by title prefix).
 */

import {
  mapPriorityToTaskPriority,
  suggestedTaskDueAt,
} from "@/lib/crm/funnel-activation/priority";
import type {
  CampaignReadinessResult,
  SalesPriority,
} from "@/lib/crm/funnel-activation/types";

export type SuggestedTask = {
  key: string;
  title: string;
  description: string;
  priority: "low" | "normal" | "high" | "urgent";
  dueAt: string;
};

const PREFIX = "[Funnel]";

export function buildActivationTasks(input: {
  readiness: CampaignReadinessResult;
  nextBestActionLabel?: string | null;
  salesPriority: SalesPriority;
}): SuggestedTask[] {
  const dueAt = suggestedTaskDueAt(input.salesPriority);
  const priority = mapPriorityToTaskPriority(input.salesPriority);
  const tasks: SuggestedTask[] = [];

  const add = (
    key: string,
    title: string,
    description: string,
    pri = priority,
  ) => {
    tasks.push({
      key,
      title: `${PREFIX} ${title}`,
      description,
      priority: pri,
      dueAt,
    });
  };

  switch (input.readiness.status) {
    case "needs_contact":
      add(
        "find_contact",
        "Find or review contact information",
        "No usable email for campaign preparation.",
      );
      break;
    case "needs_verification":
      add(
        "verify_email",
        "Verify email",
        `Review preferred email ${input.readiness.preferredEmail ?? ""}.`,
        "high",
      );
      break;
    case "needs_personalization":
      add(
        "personalization",
        "Add personalization data",
        "Company/contact context incomplete for personalized outreach.",
      );
      break;
    case "needs_approval":
    case "ready_with_review":
      add(
        "approve_readiness",
        "Approve campaign readiness",
        "Review readiness reasons before future campaign enrollment.",
        "high",
      );
      break;
    case "not_qualified":
      add(
        "review_qualification",
        "Review qualification",
        "Lead below qualification threshold.",
      );
      break;
    case "suppressed":
    case "blocked":
      add(
        "suppression_review",
        "Review suppression / exclusion",
        input.readiness.suppressionReason ?? "Record is suppressed.",
        "urgent",
      );
      break;
    case "ready":
      add(
        "prepare_outreach",
        "Prepare priority outreach",
        input.nextBestActionLabel
          ? `NBA: ${input.nextBestActionLabel}. Do not send yet.`
          : "Prepare outreach — sending is Phase Email Engine.",
        input.salesPriority === "critical" ? "urgent" : "high",
      );
      break;
    default:
      add(
        "manual_review",
        "Manual funnel review",
        "Activation completed with items needing human review.",
      );
  }

  if (
    input.readiness.contactability === "phone_ready" &&
    !input.readiness.preferredEmail
  ) {
    add("call_company", "Call company", "Phone-ready — email missing.");
  }

  return tasks;
}

export function isFunnelTaskTitle(title: string): boolean {
  return title.startsWith(PREFIX);
}
