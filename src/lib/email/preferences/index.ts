export * from "@/lib/email/preferences/constants";
export * from "@/lib/email/preferences/resolver";
export * from "@/lib/email/preferences/tokens";
export * from "@/lib/email/preferences/footer";
export * from "@/lib/email/preferences/i18n";
export {
  processUnsubscribe,
  processPreferenceUpdate,
  issuePreferenceTokens,
  resolvePreferenceToken,
  markTokenUsed,
  requestResubscribe,
  confirmResubscribe,
  createManualSuppression,
  recalculateAndPersistEffectiveStatus,
  cancelFutureEmailWorkForRecipient,
  buildListUnsubscribeHeaders,
} from "@/lib/email/preferences/service";
export {
  listRecipientPreferences,
  listSuppressions,
  getPreferenceStats,
} from "@/lib/email/preferences/queries";
