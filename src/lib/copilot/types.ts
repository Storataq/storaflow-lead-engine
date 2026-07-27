/**
 * Phase 25H — Copilot types.
 */

import type {
  CopilotActionType,
  CopilotIntent,
  CopilotMode,
} from "@/lib/copilot/constants";

export type CopilotConversationContext = {
  filters?: {
    industry?: string | null;
    country?: string | null;
    city?: string | null;
    leadScoreMin?: number | null;
    classification?: string | null;
    decisionMakersOnly?: boolean;
    dealStatus?: string | null;
    campaignStatus?: string | null;
    query?: string | null;
  };
  lastEntityType?: string | null;
  lastEntityIds?: string[];
  workflowStep?: number;
  workflowId?: string | null;
};

export type CopilotSearchHit = {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  href: string;
  score?: number | null;
};

export type CopilotActionProposal = {
  id: string;
  actionType: CopilotActionType;
  title: string;
  description: string;
  preview: Record<string, unknown>;
  requiresConfirmation: true;
  bulk?: boolean;
  href?: string | null;
};

export type CopilotInsight = {
  id: string;
  title: string;
  detail: string;
  severity: "info" | "positive" | "warning" | "critical";
};

export type CopilotRecommendation = {
  id: string;
  title: string;
  rationale: string;
  href?: string | null;
  prompt?: string | null;
};

export type CopilotTurnResult = {
  reply: string;
  intent: CopilotIntent;
  hits: CopilotSearchHit[];
  insights: CopilotInsight[];
  recommendations: CopilotRecommendation[];
  actionProposals: CopilotActionProposal[];
  contextPatch: CopilotConversationContext;
  usedProvider: boolean;
  providerCode?: string | null;
  model?: string | null;
  latencyMs: number;
};

export type CopilotUiState = {
  open: boolean;
  mode: CopilotMode;
  width: number;
  conversationId: string | null;
};

export type CopilotMessageRow = {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  intent: string | null;
  payload_json: unknown;
  action_proposals_json: unknown;
  created_at: string;
};

export type CopilotConversationRow = {
  id: string;
  title: string;
  status: string;
  mode: string;
  is_pinned: boolean;
  is_favorite: boolean;
  context_json: unknown;
  last_message_at: string | null;
  updated_at: string;
  created_at: string;
};
