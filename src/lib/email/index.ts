/**
 * Automated Email Engine — public module surface (foundation).
 * No sending. No provider SDKs. No campaign execution.
 */

export type * from "@/lib/email/types";
export type * from "@/lib/email/interfaces";

export {
  EMAIL_ENGINE_PHASE,
  EMAIL_ENGINE_CAPABILITIES,
  EMAIL_ENGINE_COMPLIANCE_NOTICE,
} from "@/lib/email/types";

export {
  personalizationEngine,
  KNOWN_PERSONALIZATION_VARIABLES,
  applyPersonalization,
  buildPersonalizationContext,
  extractTemplateVariables,
} from "@/lib/email/personalization";

export {
  renderEmailTemplate,
  previewEmailTemplate,
  validateTemplateContent,
  collectTemplateVariables,
  contextFromCrmLike,
} from "@/lib/email/template";

export {
  EMAIL_TEMPLATE_CATEGORIES,
  EMAIL_TEMPLATE_CATEGORY_LABELS,
  EMAIL_TEMPLATE_STATUSES,
  EMAIL_TEMPLATE_STATUS_LABELS,
  SUGGESTED_TEMPLATE_TAGS,
  DEFAULT_VARIABLE_FALLBACKS,
} from "@/lib/email/template/constants";

export {
  evaluateSuppression,
  normalizeSuppressionEmail,
  suppressionBlocksSending,
  mapExclusionTypeToReason,
} from "@/lib/email/suppression";

export {
  EMAIL_EVENT_TYPES,
  EMAIL_EVENT_LABELS,
  isEmailEventType,
} from "@/lib/email/events";

export {
  buildEmptyAnalyticsSnapshot,
  deriveAnalyticsRates,
} from "@/lib/email/analytics";

export {
  EMAIL_QUEUE_STATUSES,
  isTerminalQueueStatus,
  canTransitionQueueStatus,
} from "@/lib/email/queue";

export { noopEmailScheduler, SCHEDULER_MODES } from "@/lib/email/scheduler";

export {
  NotConfiguredEmailProvider,
  createDefaultEmailProvider,
  createEmailProvider,
  getDeliveryOverview,
  getEmailProviderDiagnostics,
  listRecentProviderEvents,
  ResendEmailProvider,
  SUPPORTED_PROVIDER_CODES,
  PROVIDER_INTEGRATION_NOTES,
} from "@/lib/email/provider";

export {
  EMAIL_CAMPAIGN_STATUSES,
  EMAIL_CAMPAIGN_TYPES,
  EMAIL_CAMPAIGN_TYPE_LABELS,
  EMAIL_CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_COMPLIANCE_NOTICE,
  canStartCampaign,
  canPauseCampaign,
  isCampaignTerminal,
  canEditCampaign,
  assertCampaignExecutionDisabled,
  validateCampaign,
  evaluateCampaignEligibility,
  dedupeAudienceCandidates,
} from "@/lib/email/campaign";

export {
  sortSequenceSteps,
  validateSequenceShape,
  validateSequence,
  previewSequenceTimeline,
  previewRecipientJourney,
  EMAIL_SEQUENCE_STATUSES,
  EMAIL_SEQUENCE_STATUS_LABELS,
  EMAIL_SEQUENCE_CATEGORIES,
} from "@/lib/email/sequence";

export {
  evaluateRecipientEnrollment,
  buildRecipientDraftFromPreview,
} from "@/lib/email/recipient";

export {
  createDefaultCampaignReadyAudience,
  summarizeAudienceFilter,
} from "@/lib/email/audience";

export {
  TRACKING_CAPABILITIES,
  TRACKING_FUTURE_HOOKS,
  getEngagementOverview,
  listRecentTrackingEvents,
  recordReplyFromReceivedWebhook,
  prepareTrackedMessage,
} from "@/lib/email/tracking";

export {
  processUnsubscribe,
  processPreferenceUpdate,
  resolveEffectiveCommunicationStatus,
  issuePreferenceTokens,
  injectCompliantFooter,
  recalculateAndPersistEffectiveStatus,
  DEFAULT_COMMUNICATION_CATEGORIES,
  SUPPRESSION_PRECEDENCE,
  FOOTER_VERSION,
} from "@/lib/email/preferences";

export {
  AI_GENERATION_TYPES,
  AI_GENERATION_TYPE_LABELS,
  AI_TONES,
  AI_ALLOWED_CONTEXT_FIELDS,
  isAiGloballyEnabled,
  getAIProviderDiagnostics,
  runAIGeneration,
  classifyReplyWithOptionalAI,
  classifyReplyDeterministic,
  validateGeneratedContent,
  ensureEmailAISettings,
  toGenerationPolicy,
} from "@/lib/email/ai";

export {
  validateEmailEnvironment,
  evaluateDispatchGate,
  buildEmailOpsOverview,
  runQueueReconciliation,
  evaluateCampaignLaunchGate,
  runEmailE2EHarness,
  envFlag,
} from "@/lib/email/ops";

export {
  isValidEmailSyntax,
  assertNonEmptyName,
  sanitizeMergeVariableKey,
} from "@/lib/email/validators";

export {
  slugifyEmailEntityName,
  safeTruncate,
} from "@/lib/email/utils";

export {
  CRM_EMAIL_INTEGRATION_POINTS,
  previewEnrollmentFromCampaignReady,
  toCampaignRecipientPreview,
} from "@/lib/email/crm-bridge";

export {
  BUILDER_BLOCK_TYPES,
  BUILDER_BLOCK_LABELS,
  MERGE_FIELDS,
  AUTOMATION_TRIGGERS,
  WAIT_UNITS,
  emptyWorkflowGraph,
  parseWorkflowGraph,
  scoreSubjectLine,
  buildCampaignRecommendations,
  buildCampaignPerformanceWidgets,
} from "@/lib/email/campaign-builder";

/** @deprecated Prefer imports from `@/lib/email` — kept for Phase 20D compatibility. */
export {
  EMAIL_ENGINE_INTEGRATION_POINTS,
} from "@/lib/email/future-engine";
