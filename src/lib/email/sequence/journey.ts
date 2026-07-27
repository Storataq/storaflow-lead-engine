/**
 * Recipient journey preview (mock scenarios, no execution).
 */

import { previewEmailTemplate } from "@/lib/email/template";
import type { PersonalizationContext } from "@/lib/email/interfaces";
import { previewSequenceTimeline } from "@/lib/email/sequence/timing";
import type { SequenceStep } from "@/lib/email/sequence/steps";
import type { JourneyPreviewScenario } from "@/lib/email/sequence/constants";

export type JourneyStepPreview = {
  stepId: string;
  stepName: string;
  stepType: string;
  action: string;
  renderedSubject?: string;
  renderedHtml?: string;
  delayLabel?: string;
  branchDecision?: string;
  warnings: string[];
};

export type JourneyPreviewResult = {
  scenario: string;
  recipientLabel: string;
  steps: JourneyStepPreview[];
  outcome: string;
  stopped: boolean;
  stopReason?: string;
  disclaimer: string;
};

function mockContext(_scenario: JourneyPreviewScenario): PersonalizationContext {
  return {
    companyName: "Acme Storage",
    contactFirstName: "Alex",
    contactLastName: "Example",
    email: "alex@example.com",
    industry: "Hospitality",
    city: "Amsterdam",
    country: "NL",
    ownerName: "Storaflow team",
    unsubscribeLink: "#",
  };
}

export function previewRecipientJourney(input: {
  steps: SequenceStep[];
  scenario?: JourneyPreviewScenario;
  recipientLabel?: string;
  templateContent?: {
    subject: string;
    previewText?: string | null;
    htmlBody: string;
    textBody?: string | null;
  };
}): JourneyPreviewResult {
  const scenario = input.scenario ?? "no_reply";
  const sorted = [...input.steps].sort((a, b) => a.order - b.order);
  const timeline = previewSequenceTimeline({ steps: sorted });
  const context = mockContext(scenario);
  const journeySteps: JourneyStepPreview[] = [];
  let stopped = false;
  let stopReason: string | undefined;
  let outcome = "Sequence completed (preview)";

  for (const step of sorted) {
    if (stopped) break;

    const entry = timeline.entries.find((e) => e.stepId === step.id);
    const base: JourneyStepPreview = {
      stepId: step.id,
      stepName: step.name,
      stepType: step.type,
      action: step.type,
      delayLabel: entry?.delayLabel,
      warnings: [],
    };

    if (step.type === "email" && input.templateContent) {
      const rendered = previewEmailTemplate({
        template: input.templateContent,
        data: context,
      });
      base.renderedSubject = rendered.subject;
      base.renderedHtml = rendered.htmlBody;
      base.warnings = rendered.warnings;
      base.action = "Preview email (not sent)";
    } else if (step.type === "wait") {
      base.action = `Wait ${entry?.delayLabel ?? ""}`.trim();
    } else if (step.type === "condition") {
      if (scenario === "reply_after_step_1" && step.order <= 2) {
        base.branchDecision = "Yes — recipient replied (mock)";
        stopped = true;
        stopReason = "stop_on_reply";
        outcome = "Stopped on reply (preview)";
      } else if (scenario === "unsubscribed") {
        base.branchDecision = "Exit — unsubscribed (mock)";
        stopped = true;
        stopReason = "stop_on_unsubscribe";
        outcome = "Stopped on unsubscribe (preview)";
      } else if (scenario === "invalid_email") {
        base.branchDecision = "Exit — invalid email (mock)";
        stopped = true;
        stopReason = "invalid_contact";
        outcome = "Stopped — invalid contact (preview)";
      } else {
        base.branchDecision = "No — continue (mock)";
      }
      base.action = "Evaluate condition (mock)";
    } else if (step.type === "manual_task") {
      base.action = `Manual task: ${step.task?.title ?? step.name}`;
      if (scenario === "manual_approval_required") {
        base.warnings.push("Awaiting manual approval in preview scenario");
      }
    } else if (step.type === "end") {
      base.action = `End: ${step.endReason ?? "sequence_completed"}`;
      outcome = `Ended — ${step.endReason ?? "sequence_completed"} (preview)`;
    }

    journeySteps.push(base);
  }

  return {
    scenario,
    recipientLabel: input.recipientLabel ?? "Sample recipient",
    steps: journeySteps,
    outcome,
    stopped,
    stopReason,
    disclaimer:
      "Journey preview uses mock branch decisions. No tracking events or sends.",
  };
}
