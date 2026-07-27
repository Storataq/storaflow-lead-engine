import type { StopRuleType } from "@/lib/email/sequence/constants";

export type ExecutionStopRuleEvaluation = {
  ruleType: StopRuleType | string;
  triggered: boolean;
  stopReason?: string;
};

export type StopRulesDecision = {
  stop: boolean;
  stopReason?: string;
  evaluations: ExecutionStopRuleEvaluation[];
};

export type StopRulesInput = {
  stopRules: string[];
  campaignExecutionStatus: string;
  enrollmentStatus: string;
  // Snapshot row from email_recipients (immutable for this execution).
  suppressionStatus?: string | null;
  validationStatus?: string | null;
  attemptCount: number;
  maximumAttempts: number;
};

export function evaluateExecutionStopRules(
  input: StopRulesInput,
): StopRulesDecision {
  const evaluations: ExecutionStopRuleEvaluation[] = [];
  const stopOn = (code: string): boolean => input.stopRules.includes(code);

  // Hard stops regardless of configured list.
  if (input.campaignExecutionStatus === "cancelled") {
    return {
      stop: true,
      stopReason: "campaign_cancelled",
      evaluations: [
        {
          ruleType: "campaign_cancelled",
          triggered: true,
          stopReason: "campaign_cancelled",
        },
      ],
    };
  }
  if (input.enrollmentStatus === "cancelled") {
    return {
      stop: true,
      stopReason: "enrollment_cancelled",
      evaluations: [
        {
          ruleType: "enrollment_cancelled",
          triggered: true,
          stopReason: "enrollment_cancelled",
        },
      ],
    };
  }

  // Manual pause placeholder.
  if (
    stopOn("stop_on_manual_pause") &&
    (input.campaignExecutionStatus === "paused" ||
      input.enrollmentStatus === "paused")
  ) {
    evaluations.push({
      ruleType: "stop_on_manual_pause",
      triggered: true,
      stopReason: "manual_exit",
    });
    return { stop: true, stopReason: "manual_exit", evaluations };
  }

  const suppressionStatus = input.suppressionStatus ?? "active";
  const validationStatus = input.validationStatus ?? "unknown";

  // Unsubscribe mandatory.
  if (stopOn("stop_on_unsubscribe") && suppressionStatus === "unsubscribed") {
    evaluations.push({
      ruleType: "stop_on_unsubscribe",
      triggered: true,
      stopReason: "recipient_unsubscribed",
    });
    return { stop: true, stopReason: "recipient_unsubscribed", evaluations };
  }

  // Complaint mandatory.
  if (stopOn("stop_on_complaint") && suppressionStatus === "complaint") {
    evaluations.push({
      ruleType: "stop_on_complaint",
      triggered: true,
      stopReason: "recipient_complaint",
    });
    return { stop: true, stopReason: "recipient_complaint", evaluations };
  }

  // Hard bounce placeholder: we don't have delivery/bounce events yet, so
  // treat invalid email validation as a hard stop when configured.
  if (
    stopOn("stop_on_hard_bounce") &&
    (suppressionStatus === "invalid_email" || validationStatus === "syntax_invalid")
  ) {
    evaluations.push({
      ruleType: "stop_on_hard_bounce",
      triggered: true,
      stopReason: "invalid_contact",
    });
    return { stop: true, stopReason: "invalid_contact", evaluations };
  }

  // Suppressed mandatory.
  if (
    stopOn("stop_on_suppressed") &&
    suppressionStatus !== "active"
  ) {
    evaluations.push({
      ruleType: "stop_on_suppressed",
      triggered: true,
      stopReason: "recipient_suppressed",
    });
    return { stop: true, stopReason: "recipient_suppressed", evaluations };
  }

  // Max attempts.
  if (
    stopOn("stop_after_max_attempts") &&
    input.attemptCount >= input.maximumAttempts
  ) {
    evaluations.push({
      ruleType: "stop_after_max_attempts",
      triggered: true,
      stopReason: "max_attempts",
    });
    return { stop: true, stopReason: "max_attempts", evaluations };
  }

  // Placeholder rules for future phases: do not stop now.
  evaluations.push(
    { ruleType: "stop_on_lead_status_change", triggered: false },
    { ruleType: "stop_on_pipeline_stage_change", triggered: false },
    { ruleType: "stop_on_deal_won", triggered: false },
    { ruleType: "stop_on_deal_lost", triggered: false },
    { ruleType: "custom_rule", triggered: false },
  );

  return { stop: false, evaluations };
}

