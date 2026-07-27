/**
 * Intent + filter extraction from natural language (deterministic first pass).
 */

import type { CopilotIntent } from "@/lib/copilot/constants";
import type { CopilotConversationContext } from "@/lib/copilot/types";

export type ParsedCopilotQuery = {
  intent: CopilotIntent;
  filters: NonNullable<CopilotConversationContext["filters"]>;
  actionHint: string | null;
  emailKind: string | null;
  summarizeTarget: string | null;
};

function includesAny(text: string, needles: string[]): boolean {
  return needles.some((n) => text.includes(n));
}

export function parseCopilotQuery(
  input: string,
  prior?: CopilotConversationContext | null,
): ParsedCopilotQuery {
  const text = input.trim().toLowerCase();
  const filters: NonNullable<CopilotConversationContext["filters"]> = {
    ...(prior?.filters ?? {}),
  };

  // Geographic / industry filters (context memory friendly)
  const cityMatch = text.match(
    /\b(?:in|near|around)\s+([a-zà-öø-ÿ\s-]{2,40})(?:\?|\.|$)/i,
  );
  if (cityMatch?.[1]) {
    const city = cityMatch[1].trim().replace(/\b(only|with|and)\b/gi, "").trim();
    if (city.length > 1) filters.city = city;
  }
  if (includesAny(text, ["amsterdam"])) filters.city = "Amsterdam";
  if (includesAny(text, ["germany", "deutschland", "duitsland"])) {
    filters.country = "Germany";
  }
  if (includesAny(text, ["netherlands", "nederland", "holland"])) {
    filters.country = "Netherlands";
  }
  if (includesAny(text, ["restaurant"])) filters.industry = "restaurant";
  if (includesAny(text, ["bicycle", "fiets", "bike shop", "bike store"])) {
    filters.industry = filters.industry ?? "bicycle";
    filters.query = filters.query ?? "bicycle";
  }
  if (includesAny(text, ["retail"])) filters.industry = "retail";

  const scoreMatch = text.match(
    /(?:above|over|min(?:imum)?|>=?)\s*(\d{1,3})/,
  );
  if (scoreMatch) filters.leadScoreMin = Number(scoreMatch[1]);
  if (includesAny(text, ["above 90", "over 90", "> 90", ">90"])) {
    filters.leadScoreMin = 90;
  }
  if (includesAny(text, ["above 85", "over 85", "> 85", ">85"])) {
    filters.leadScoreMin = 85;
  }

  if (includesAny(text, ["hot lead", "very hot", "hot leads"])) {
    filters.classification = "hot";
  }
  if (includesAny(text, ["decision maker", "decision-makers", "beslisser"])) {
    filters.decisionMakersOnly = true;
  }
  if (includesAny(text, ["lost deal", "lost deals"])) filters.dealStatus = "lost";
  if (includesAny(text, ["won deal", "won deals"])) filters.dealStatus = "won";
  if (includesAny(text, ["active campaign", "active campaigns"])) {
    filters.campaignStatus = "active";
  }
  if (includesAny(text, ["only those", "only the", "filter to", "narrow to"])) {
    // keep prior filters; refinement
  }

  let intent: CopilotIntent = "general";
  let actionHint: string | null = null;
  let emailKind: string | null = null;
  let summarizeTarget: string | null = null;

  if (includesAny(text, ["without website", "no website", "missing website"])) {
    intent = "search_companies";
    filters.query = "no_website";
  } else if (
    includesAny(text, [
      "missing decision",
      "without decision",
      "no decision maker",
    ])
  ) {
    intent = "search_contacts";
    filters.decisionMakersOnly = false;
    filters.query = "missing_decision_maker";
  } else if (includesAny(text, ["overdue task", "who should i call", "follow-up", "follow up"])) {
    intent = "search_tasks";
  } else if (includesAny(text, ["stuck deal", "stalled deal", "pipeline"])) {
    intent = includesAny(text, ["summarize", "summary", "analyse", "analyze"])
      ? "summarize"
      : "search_deals";
    if (intent === "summarize") summarizeTarget = "pipeline";
  } else if (includesAny(text, ["campaign"])) {
    intent = includesAny(text, ["best", "perform", "open rate", "improve"])
      ? "analytics"
      : "search_campaigns";
  } else if (includesAny(text, ["deal"])) {
    intent = "search_deals";
  } else if (includesAny(text, ["contact", "decision maker"])) {
    intent = "search_contacts";
  } else if (
    includesAny(text, ["company", "companies", "store", "stores", "lead", "leads"])
  ) {
    intent = includesAny(text, ["hot", "score", "classification"])
      ? "filter_leads"
      : "search_companies";
  } else if (includesAny(text, ["insight", "declined", "improved", "increased", "failed"])) {
    intent = "insights";
  } else if (includesAny(text, ["recommend", "should i", "what next", "next action"])) {
    intent = "recommendations";
  } else if (
    includesAny(text, [
      "write email",
      "draft email",
      "cold email",
      "follow-up email",
      "newsletter",
      "thank-you",
      "proposal",
      "re-engagement",
    ])
  ) {
    intent = "write_email";
    if (text.includes("cold")) emailKind = "cold";
    else if (text.includes("follow")) emailKind = "follow_up";
    else if (text.includes("reminder")) emailKind = "reminder";
    else if (text.includes("proposal")) emailKind = "proposal";
    else if (text.includes("thank")) emailKind = "thank_you";
    else if (text.includes("re-engagement") || text.includes("reengagement")) {
      emailKind = "re_engagement";
    } else if (text.includes("newsletter")) emailKind = "newsletter";
    else emailKind = "personalized";
  } else if (includesAny(text, ["summarize", "summary", "explain revenue", "conversion"])) {
    intent = includesAny(text, ["revenue", "conversion", "analytics", "automation result"])
      ? "analytics"
      : "summarize";
    if (text.includes("company")) summarizeTarget = "company";
    else if (text.includes("contact")) summarizeTarget = "contact";
    else if (text.includes("campaign")) summarizeTarget = "campaign";
    else if (text.includes("month")) summarizeTarget = "month";
    else if (text.includes("pipeline")) summarizeTarget = "pipeline";
  }

  if (
    includesAny(text, [
      "create task",
      "create deal",
      "create company",
      "create contact",
      "create campaign",
      "create automation",
      "assign",
      "export",
      "delete",
      "move deal",
      "refresh lead score",
      "start campaign",
      "generate campaign",
      "hubspot",
      "google calendar",
      "google drive",
      "notify slack",
      "slack",
      "upload proposal",
      "create meeting",
    ])
  ) {
    intent = "propose_action";
    if (text.includes("hubspot")) actionHint = "export_to_hubspot";
    else if (
      text.includes("calendar") ||
      text.includes("meeting") ||
      text.includes("google calendar")
    ) {
      actionHint = "create_calendar_event";
    } else if (
      text.includes("drive") ||
      text.includes("upload proposal") ||
      text.includes("upload")
    ) {
      actionHint = "upload_to_drive";
    } else if (text.includes("slack") || text.includes("notify")) {
      actionHint = "notify_slack";
    } else if (text.includes("task")) actionHint = "create_task";
    else if (text.includes("deal") && text.includes("move")) actionHint = "move_deal";
    else if (text.includes("deal")) actionHint = "create_deal";
    else if (text.includes("company")) actionHint = "create_company";
    else if (text.includes("contact")) actionHint = "create_contact";
    else if (text.includes("campaign")) actionHint = "start_campaign";
    else if (text.includes("automation")) actionHint = "create_automation";
    else if (text.includes("assign")) actionHint = "assign_user";
    else if (text.includes("export")) actionHint = "export_data";
    else if (text.includes("delete")) actionHint = "delete_record";
    else if (text.includes("score")) actionHint = "refresh_lead_score";
  }

  if (
    includesAny(text, ["then", "after that", "next", "↓"]) ||
    (prior?.workflowId && includesAny(text, ["only", "generate", "schedule"]))
  ) {
    if (intent === "general" || intent === "search_companies") {
      intent = prior?.workflowId ? intent : "multi_step";
    }
  }

  if (includesAny(text, ["help", "what can you", "how do i"])) {
    intent = "help";
  }

  return { intent, filters, actionHint, emailKind, summarizeTarget };
}

export function mergeContext(
  prior: CopilotConversationContext | null | undefined,
  patch: CopilotConversationContext,
): CopilotConversationContext {
  return {
    ...prior,
    ...patch,
    filters: {
      ...(prior?.filters ?? {}),
      ...(patch.filters ?? {}),
    },
  };
}
