/**
 * Phase 25H — Copilot public surface (client-safe exports only in consumers).
 */

export {
  COPILOT_MODES,
  COPILOT_MODE_LABELS,
  COPILOT_INTENTS,
  COPILOT_ACTION_TYPES,
  COPILOT_ACTION_LABELS,
  COPILOT_MUTATING_ACTIONS,
  STARTER_PROMPTS,
  QUICK_ACTIONS,
  FUTURE_VOICE_CAPABILITIES,
  FUTURE_AI_PROVIDERS,
  COPILOT_UI_STORAGE_KEY,
} from "@/lib/copilot/constants";

export type {
  CopilotMode,
  CopilotIntent,
  CopilotActionType,
} from "@/lib/copilot/constants";

export type {
  CopilotTurnResult,
  CopilotActionProposal,
  CopilotSearchHit,
  CopilotUiState,
  CopilotConversationContext,
} from "@/lib/copilot/types";
