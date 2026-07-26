/**
 * Sales priority + personalization readiness (deterministic).
 */

import type {
  PersonalizationStatus,
  SalesPriority,
} from "@/lib/crm/funnel-activation/types";
import type { ContactabilityClass } from "@/lib/crm/funnel-activation/types";

export function calculateSalesPriority(input: {
  qualificationScore: number;
  opportunityScore: number;
  contactability: ContactabilityClass;
  suppressed: boolean;
  dataCompleteness: number;
}): { priority: SalesPriority; score: number; reasons: string[]; timing: string } {
  if (input.suppressed) {
    return {
      priority: "not_ready",
      score: 0,
      reasons: ["Suppressed — cannot prioritize for outreach"],
      timing: "Do not contact",
    };
  }

  const contactBoost =
    input.contactability === "multi_channel_ready"
      ? 15
      : input.contactability === "email_ready"
        ? 12
        : input.contactability === "general_contact_only"
          ? 6
          : input.contactability === "phone_ready"
            ? 5
            : 0;

  const score = Math.min(
    100,
    Math.round(
      input.qualificationScore * 0.45 +
        input.opportunityScore * 0.35 +
        input.dataCompleteness * 0.1 +
        contactBoost,
    ),
  );

  const reasons: string[] = [
    `Qualification ${input.qualificationScore}`,
    `Opportunity ${input.opportunityScore}`,
    `Contactability ${input.contactability}`,
  ];

  if (score >= 85) {
    return {
      priority: "critical",
      score,
      reasons,
      timing: "Today or next business day",
    };
  }
  if (score >= 70) {
    return {
      priority: "high",
      score,
      reasons,
      timing: "Within 1–2 business days",
    };
  }
  if (score >= 55) {
    return {
      priority: "medium",
      score,
      reasons,
      timing: "Within 3–5 business days",
    };
  }
  if (score >= 40) {
    return {
      priority: "low",
      score,
      reasons,
      timing: "Within 7–14 days",
    };
  }
  if (score >= 25) {
    return {
      priority: "nurture",
      score,
      reasons,
      timing: "Future review date",
    };
  }
  return {
    priority: "not_ready",
    score,
    reasons,
    timing: "Not ready for outreach",
  };
}

export function evaluatePersonalization(input: {
  companyName?: string | null;
  contactFirstName?: string | null;
  contactRole?: string | null;
  industry?: string | null;
  location?: string | null;
  website?: string | null;
  description?: string | null;
}): {
  status: PersonalizationStatus;
  fields: Record<string, string | null>;
  reasons: string[];
} {
  const fields = {
    company_name: input.companyName?.trim() || null,
    contact_first_name: input.contactFirstName?.trim() || null,
    contact_role: input.contactRole?.trim() || null,
    industry: input.industry?.trim() || null,
    location: input.location?.trim() || null,
    website: input.website?.trim() || null,
    description: input.description?.trim() || null,
  };

  const filled = Object.values(fields).filter(Boolean).length;
  const reasons: string[] = [`${filled}/7 personalization fields filled`];

  if (fields.company_name && fields.contact_first_name && fields.industry) {
    return { status: "personalized", fields, reasons };
  }
  if (fields.company_name && (fields.industry || fields.website)) {
    return { status: "company_level", fields, reasons };
  }
  if (fields.company_name) {
    return { status: "limited", fields, reasons };
  }
  if (filled > 0) {
    return { status: "needs_review", fields, reasons };
  }
  return { status: "missing_personalization", fields, reasons };
}

export function suggestedTaskDueAt(
  priority: SalesPriority,
  now = new Date(),
): string {
  const days =
    priority === "critical"
      ? 1
      : priority === "high"
        ? 2
        : priority === "medium"
          ? 4
          : priority === "low"
            ? 10
            : priority === "nurture"
              ? 21
              : 7;
  const due = new Date(now);
  due.setUTCDate(due.getUTCDate() + days);
  due.setUTCHours(12, 0, 0, 0);
  return due.toISOString();
}

export function mapPriorityToTaskPriority(
  priority: SalesPriority,
): "low" | "normal" | "high" | "urgent" {
  switch (priority) {
    case "critical":
      return "urgent";
    case "high":
      return "high";
    case "medium":
      return "normal";
    default:
      return "low";
  }
}
