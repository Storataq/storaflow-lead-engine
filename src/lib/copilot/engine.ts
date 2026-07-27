/**
 * Copilot turn engine — deterministic tools + optional LLM enrichment.
 */

import { randomUUID } from "crypto";

import {
  COPILOT_ACTION_LABELS,
  COPILOT_MUTATING_ACTIONS,
  type CopilotActionType,
} from "@/lib/copilot/constants";
import { mergeContext, parseCopilotQuery } from "@/lib/copilot/intent";
import {
  buildLiveInsights,
  searchCampaignsTool,
  searchCompaniesTool,
  searchContactsTool,
  searchDealsTool,
  searchLeadsTool,
  searchTasksTool,
} from "@/lib/copilot/tools";
import type {
  CopilotActionProposal,
  CopilotConversationContext,
  CopilotTurnResult,
} from "@/lib/copilot/types";
import { createAIProvider } from "@/lib/email/ai/provider";
import { getDefaultAiModel, isAiGloballyEnabled } from "@/lib/email/ai/constants";
import {
  formatConnectedIntegrationsLine,
  listConnectedIntegrationsForCopilot,
} from "@/lib/integrations/copilot-bridge";

function propose(
  actionType: CopilotActionType,
  title: string,
  description: string,
  preview: Record<string, unknown>,
  bulk = false,
): CopilotActionProposal {
  return {
    id: randomUUID(),
    actionType,
    title,
    description,
    preview,
    requiresConfirmation: true,
    bulk,
    href: null,
  };
}

function formatHits(
  hits: CopilotTurnResult["hits"],
  emptyHint: string,
): string {
  if (hits.length === 0) return emptyHint;
  const lines = hits
    .slice(0, 8)
    .map((h, i) => `${i + 1}. ${h.title}${h.subtitle ? ` — ${h.subtitle}` : ""}`);
  return `Found ${hits.length} result(s):\n${lines.join("\n")}`;
}

export async function runCopilotTurn(input: {
  organizationId: string;
  message: string;
  priorContext?: CopilotConversationContext | null;
  history?: Array<{ role: string; content: string }>;
}): Promise<CopilotTurnResult> {
  const started = Date.now();
  const parsed = parseCopilotQuery(input.message, input.priorContext);
  const filters = parsed.filters;
  let hits: CopilotTurnResult["hits"] = [];
  let insights: CopilotTurnResult["insights"] = [];
  let recommendations: CopilotTurnResult["recommendations"] = [];
  const actionProposals: CopilotActionProposal[] = [];
  let reply = "";

  switch (parsed.intent) {
    case "search_companies":
      hits = await searchCompaniesTool(input.organizationId, filters);
      reply = formatHits(
        hits,
        "No companies matched. Try broadening industry/city filters or import companies first.",
      );
      if (filters.query === "no_website" && hits.length) {
        actionProposals.push(
          propose(
            "analyze_website",
            "Re-run website analysis",
            `Prepare enrichment for ${hits.length} companies without websites.`,
            { companyIds: hits.map((h) => h.id), count: hits.length },
            true,
          ),
        );
      }
      break;
    case "filter_leads":
    case "search_contacts":
      if (parsed.intent === "filter_leads" || filters.classification || filters.leadScoreMin) {
        hits = await searchLeadsTool(input.organizationId, filters);
        reply = formatHits(
          hits,
          "No leads matched those score/classification filters. Run AI Lead Scoring if scores are empty.",
        );
      } else {
        hits = await searchContactsTool(input.organizationId, filters);
        reply = formatHits(
          hits,
          "No contacts matched. Enrich contacts or mark decision makers.",
        );
      }
      break;
    case "search_deals":
      hits = await searchDealsTool(input.organizationId, filters);
      reply = formatHits(
        hits,
        "No deals matched. Create deals in CRM or clear status filters.",
      );
      break;
    case "search_tasks":
      hits = await searchTasksTool(input.organizationId);
      reply = formatHits(
        hits,
        "No open/overdue tasks found. You're clear for now.",
      );
      if (hits.length) {
        actionProposals.push(
          propose(
            "create_task",
            "Create follow-up task",
            "Prepare a follow-up task for the first item.",
            { title: `Follow up: ${hits[0]!.title}`, leadHref: hits[0]!.href },
          ),
        );
      }
      break;
    case "search_campaigns":
    case "analytics":
      hits = await searchCampaignsTool(input.organizationId, filters);
      if (parsed.intent === "analytics") {
        const live = await buildLiveInsights(input.organizationId);
        insights = live.insights;
        recommendations = live.recommendations;
        reply = [
          hits.length
            ? `Campaigns in scope: ${hits.map((h) => h.title).slice(0, 5).join(", ")}.`
            : "No campaigns found for this filter.",
          "",
          "Analytics notes (grounded in available live signals):",
          ...insights.map((i) => `• ${i.title}: ${i.detail}`),
        ].join("\n");
      } else {
        reply = formatHits(hits, "No campaigns found.");
      }
      break;
    case "insights":
    case "recommendations": {
      const live = await buildLiveInsights(input.organizationId);
      insights = live.insights;
      recommendations = live.recommendations;
      reply =
        parsed.intent === "insights"
          ? [
              "Insights from live organization data:",
              ...insights.map((i) => `• [${i.severity}] ${i.title} — ${i.detail}`),
            ].join("\n")
          : [
              "Recommended next actions:",
              ...recommendations.map((r) => `• ${r.title} — ${r.rationale}`),
            ].join("\n");
      break;
    }
    case "summarize": {
      const live = await buildLiveInsights(input.organizationId);
      insights = live.insights;
      recommendations = live.recommendations;
      const target = parsed.summarizeTarget ?? "workspace";
      reply = [
        `Summary (${target}) for your organization:`,
        ...insights.map((i) => `• ${i.title}: ${i.detail}`),
        recommendations[0]
          ? `Suggested next step: ${recommendations[0].title}.`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
      break;
    }
    case "write_email": {
      const kind = parsed.emailKind ?? "personalized";
      const draft = buildEmailDraft(kind, filters);
      reply = draft;
      actionProposals.push(
        propose(
          "generate_email",
          "Save email draft proposal",
          "Open the email writing assistant with this brief (confirmation required before any send).",
          { kind, draftPreview: draft.slice(0, 500) },
        ),
      );
      break;
    }
    case "propose_action": {
      const actionType = (parsed.actionHint ?? "create_task") as CopilotActionType;
      const label = COPILOT_ACTION_LABELS[actionType] ?? actionType;
      const connected = await listConnectedIntegrationsForCopilot(
        input.organizationId,
      );
      const integrationLine = formatConnectedIntegrationsLine(connected);
      const needsIntegration =
        actionType === "export_to_hubspot" ||
        actionType === "create_calendar_event" ||
        actionType === "upload_to_drive" ||
        actionType === "notify_slack";
      const codeHint =
        actionType === "export_to_hubspot"
          ? "hubspot"
          : actionType === "create_calendar_event"
            ? "google_workspace"
            : actionType === "upload_to_drive"
              ? "google_drive"
              : actionType === "notify_slack"
                ? "slack"
                : null;
      const isConnected = codeHint
        ? connected.some((c) => c.code === codeHint && c.status === "connected")
        : true;
      reply = [
        `I can prepare “${label}”. Data-changing actions always need your confirmation before execution.`,
        integrationLine,
        needsIntegration && !isConnected
          ? `Connect ${codeHint} in the Integrations Marketplace before completing this action.`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
      actionProposals.push(
        propose(
          actionType,
          label,
          `Confirm to proceed with ${label}. Bulk and delete actions show a preview first.`,
          {
            sourceMessage: input.message,
            filters,
            requiresConfirmation: COPILOT_MUTATING_ACTIONS.has(actionType),
            connectedIntegrations: connected.map((c) => c.code),
            integrationReady: isConnected,
          },
          actionType === "export_data" || actionType === "delete_record",
        ),
      );
      break;
    }
    case "multi_step":
      reply = [
        "Multi-step workflow ready. Current filters in memory:",
        JSON.stringify(filters, null, 2),
        "",
        "Say what to do next (e.g. “Only hot leads”, “Generate campaign”, “Generate emails”).",
      ].join("\n");
      actionProposals.push(
        propose(
          "start_campaign",
          "Generate campaign (proposal)",
          "Prepare a campaign draft for the current filtered audience.",
          { filters },
          true,
        ),
      );
      break;
    case "help": {
      const connected = await listConnectedIntegrationsForCopilot(
        input.organizationId,
      );
      reply = [
        "I'm the Storaflow AI Copilot. I can search companies, contacts, deals, tasks, and campaigns;",
        "filter by industry, country, score, and decision makers; draft emails; summarize CRM;",
        "and propose actions including HubSpot export, Slack notify, Drive upload, and Calendar meetings.",
        "Writes always require confirmation.",
        formatConnectedIntegrationsLine(connected),
        "",
        "Try: “Export this list to HubSpot”, “Notify Slack”, “Create Google Calendar meeting”.",
      ].join("\n");
      break;
    }
    default: {
      // Try a broad lead search when ambiguous
      hits = await searchLeadsTool(input.organizationId, filters, 5);
      if (hits.length === 0) {
        hits = await searchCompaniesTool(input.organizationId, filters, 5);
      }
      reply = hits.length
        ? `Here’s what I found related to your question:\n${formatHits(hits, "")}`
        : "I understood your message. Try a more specific ask (search, filter, summarize, write email, or propose an action).";
    }
  }

  let usedProvider = false;
  let providerCode: string | null = null;
  let model: string | null = null;

  if (isAiGloballyEnabled()) {
    try {
      const provider = createAIProvider();
      if (provider.isConfigured()) {
        const enrichment = await provider.complete({
          model: getDefaultAiModel(),
          system: [
            "You are Storaflow AI Copilot. Improve clarity of the assistant reply.",
            "Do NOT invent metrics, companies, or results. Stay grounded in the TOOL_RESULT.",
            "Keep under 180 words. Separate facts from suggestions.",
            "Never claim you already sent email or changed CRM data.",
          ].join(" "),
          user: JSON.stringify({
            userMessage: input.message,
            toolResult: reply,
            hits: hits.slice(0, 5),
            insights,
            history: (input.history ?? []).slice(-6),
          }),
          maxOutputTokens: 500,
          temperature: 0.3,
          responseFormat: "text",
        });
        if (enrichment.content?.trim()) {
          reply = enrichment.content.trim();
          usedProvider = true;
          providerCode = provider.code;
          model = enrichment.model;
        }
      }
    } catch {
      // Keep deterministic reply when provider fails
    }
  }

  const contextPatch: CopilotConversationContext = mergeContext(
    input.priorContext,
    {
      filters,
      lastEntityType: hits[0]?.type ?? input.priorContext?.lastEntityType,
      lastEntityIds: hits.map((h) => h.id).slice(0, 20),
      workflowId:
        parsed.intent === "multi_step"
          ? input.priorContext?.workflowId ?? randomUUID()
          : input.priorContext?.workflowId ?? null,
      workflowStep:
        parsed.intent === "multi_step"
          ? (input.priorContext?.workflowStep ?? 0) + 1
          : input.priorContext?.workflowStep,
    },
  );

  return {
    reply,
    intent: parsed.intent,
    hits,
    insights,
    recommendations,
    actionProposals,
    contextPatch,
    usedProvider,
    providerCode,
    model,
    latencyMs: Date.now() - started,
  };
}

function buildEmailDraft(
  kind: string,
  filters: NonNullable<CopilotConversationContext["filters"]>,
): string {
  const audience = [
    filters.industry,
    filters.city,
    filters.country,
    filters.classification ? `${filters.classification} leads` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const subjects: Record<string, string> = {
    cold: "Quick question about growth opportunities",
    follow_up: "Following up on our conversation",
    reminder: "Friendly reminder",
    proposal: "Proposal for your review",
    thank_you: "Thank you",
    re_engagement: "Still interested in improving results?",
    newsletter: "This month’s insights",
    personalized: "A note tailored to your team",
  };

  return [
    `Subject: ${subjects[kind] ?? subjects.personalized}`,
    "",
    `Hi {{first_name}},`,
    "",
    kind === "cold"
      ? `I noticed your company${audience ? ` (${audience})` : ""} and wanted to share a short idea that helps similar teams qualify leads faster.`
      : `Sharing a brief ${kind.replace("_", " ")} note${audience ? ` for ${audience}` : ""}.`,
    "",
    "Would you be open to a 15-minute call this week?",
    "",
    "Best regards,",
    "{{sender_name}}",
    "",
    "(Draft only — sending requires explicit confirmation in the email module.)",
  ].join("\n");
}
