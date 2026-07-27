/**
 * Phase 21I — Communication preferences, unsubscribe & suppression domain.
 */

export const COMMUNICATION_STATUSES = [
  "subscribed",
  "partially_subscribed",
  "paused",
  "unsubscribed",
  "suppressed",
  "invalid",
  "complaint_blocked",
  "hard_bounce_blocked",
  "legal_hold",
  "unknown",
] as const;

export type CommunicationStatus = (typeof COMMUNICATION_STATUSES)[number];

export const COMMUNICATION_PREFERENCE_SCOPES = [
  "organization",
  "category",
  "campaign",
  "sequence",
  "sender_profile",
  "temporary_pause",
  "legal",
] as const;

export type CommunicationPreferenceScope =
  (typeof COMMUNICATION_PREFERENCE_SCOPES)[number];

export const DEFAULT_COMMUNICATION_CATEGORIES = [
  {
    code: "sales_outreach",
    name: "Sales Outreach",
    isEssential: false,
    defaultSubscribed: true,
    displayOrder: 10,
  },
  {
    code: "marketing",
    name: "Marketing",
    isEssential: false,
    defaultSubscribed: true,
    displayOrder: 20,
  },
  {
    code: "product_updates",
    name: "Product Updates",
    isEssential: false,
    defaultSubscribed: true,
    displayOrder: 30,
  },
  {
    code: "newsletters",
    name: "Newsletters",
    isEssential: false,
    defaultSubscribed: true,
    displayOrder: 40,
  },
  {
    code: "events",
    name: "Events",
    isEssential: false,
    defaultSubscribed: true,
    displayOrder: 50,
  },
  {
    code: "feature_announcements",
    name: "Feature Announcements",
    isEssential: false,
    defaultSubscribed: true,
    displayOrder: 60,
  },
  {
    code: "beta_programs",
    name: "Beta Programs",
    isEssential: false,
    defaultSubscribed: true,
    displayOrder: 70,
  },
  {
    code: "partner_offers",
    name: "Partner Offers",
    isEssential: false,
    defaultSubscribed: true,
    displayOrder: 80,
  },
  {
    code: "transactional",
    name: "Transactional",
    isEssential: true,
    defaultSubscribed: true,
    displayOrder: 90,
  },
  {
    code: "system_notifications",
    name: "System Notifications",
    isEssential: true,
    defaultSubscribed: true,
    displayOrder: 100,
  },
] as const;

export const COMMUNICATION_FREQUENCIES = [
  "no_promotional",
  "immediate",
  "daily",
  "weekly",
  "every_two_weeks",
  "monthly",
  "quarterly",
  "only_important",
  "custom",
] as const;

export type CommunicationFrequency =
  (typeof COMMUNICATION_FREQUENCIES)[number];

export const FREQUENCY_DEFAULTS: Record<
  CommunicationFrequency,
  { minDays: number | null; maxPerWeek: number | null; maxPerMonth: number | null }
> = {
  no_promotional: { minDays: null, maxPerWeek: 0, maxPerMonth: 0 },
  immediate: { minDays: 0, maxPerWeek: null, maxPerMonth: null },
  daily: { minDays: 1, maxPerWeek: 7, maxPerMonth: 31 },
  weekly: { minDays: 7, maxPerWeek: 1, maxPerMonth: 5 },
  every_two_weeks: { minDays: 14, maxPerWeek: 1, maxPerMonth: 3 },
  monthly: { minDays: 28, maxPerWeek: 1, maxPerMonth: 1 },
  quarterly: { minDays: 90, maxPerWeek: 1, maxPerMonth: 1 },
  only_important: { minDays: 14, maxPerWeek: 1, maxPerMonth: 2 },
  custom: { minDays: null, maxPerWeek: null, maxPerMonth: null },
};

export const PAUSE_PRESETS_DAYS = [7, 14, 30, 60, 90] as const;

export const UNSUBSCRIBE_REASON_CODES = [
  "too_many_emails",
  "not_relevant",
  "never_signed_up",
  "no_longer_interested",
  "changed_role",
  "wrong_person",
  "privacy_concern",
  "prefer_another_channel",
  "other",
  "no_reason_provided",
] as const;

export type UnsubscribeReasonCode = (typeof UNSUBSCRIBE_REASON_CODES)[number];

export const SUPPRESSION_SOURCES = [
  "preference_center",
  "one_click_unsubscribe",
  "email_footer",
  "inbound_reply",
  "provider_webhook",
  "admin_action",
  "crm_action",
  "import",
  "api",
  "legal_request",
  "automated_bounce_policy",
  "automated_complaint_policy",
] as const;

export type SuppressionSource = (typeof SUPPRESSION_SOURCES)[number];

/**
 * Strongest → weakest. Weaker states must not override stronger ones.
 */
export const SUPPRESSION_PRECEDENCE: Record<string, number> = {
  legal_restriction: 1,
  complaint: 2,
  spam_trap: 3,
  bounce_hard: 4,
  do_not_contact: 5,
  unsubscribed: 6,
  manual: 7,
  user_blocked: 7,
  invalid_email: 8,
  repeated_soft_bounce: 9,
  category_unsubscribe: 10,
  campaign_unsubscribe: 11,
  sequence_unsubscribe: 12,
  temporary_pause: 13,
  frequency_preference: 14,
  other: 100,
};

export const MANDATORY_SUPPRESSION_REASONS = new Set([
  "legal_restriction",
  "complaint",
  "bounce_hard",
  "do_not_contact",
]);

export const COMMUNICATION_PURPOSES = [
  "promotional",
  "sales_outreach",
  "newsletter",
  "product_update",
  "transactional",
  "essential_system",
  "legal",
  "internal_test",
] as const;

export type CommunicationPurpose = (typeof COMMUNICATION_PURPOSES)[number];

export const ESSENTIAL_PURPOSES = new Set<CommunicationPurpose>([
  "transactional",
  "essential_system",
  "legal",
]);

export const PREFERENCE_TOKEN_PURPOSES = [
  "preference_center",
  "one_click_unsubscribe",
  "unsubscribe_page",
  "resubscribe_confirm",
  "single_use_confirm",
] as const;

export type PreferenceTokenPurpose =
  (typeof PREFERENCE_TOKEN_PURPOSES)[number];

export const FOOTER_VERSION = "21i.v1";

export type CommunicationPreference = {
  id: string;
  organizationId: string;
  emailNormalized: string;
  effectiveStatus: CommunicationStatus;
  frequencyType: CommunicationFrequency;
  preferredLanguage: string | null;
  preferredTimezone: string | null;
  categoryPreferences: Record<string, boolean>;
  pauseEndsAt: string | null;
  eligibleForOutreach: boolean;
  doNotContact: boolean;
};

export type SuppressionEvaluationResult = {
  blocked: boolean;
  effectiveStatus: CommunicationStatus;
  eligible: boolean;
  blockingReasons: string[];
  warningReasons: string[];
  nextEligibleAt: string | null;
  strongestSuppressionReason: string | null;
  strongestPrecedence: number | null;
  appliedRules: string[];
  evaluatedAt: string;
};

export type UnsubscribeCommand = {
  organizationId: string;
  emailNormalized: string;
  scope: CommunicationPreferenceScope;
  categoryCode?: string | null;
  campaignId?: string | null;
  sequenceId?: string | null;
  reasonCode?: UnsubscribeReasonCode | null;
  reasonText?: string | null;
  source: string;
  relatedQueueItemId?: string | null;
  idempotencyKey: string;
  contactId?: string | null;
  leadId?: string | null;
  companyId?: string | null;
  ipHash?: string | null;
  userAgentHash?: string | null;
};

export type UnsubscribeSideEffectSummary = {
  preferenceUpdated: boolean;
  suppressionUpserted: boolean;
  enrollmentsStopped: number;
  queueJobsCancelled: number;
  crmActivityWritten: boolean;
  alreadyProcessed: boolean;
};

export type UnsubscribeResult = {
  success: boolean;
  message: string;
  effectiveStatus: CommunicationStatus;
  sideEffects: UnsubscribeSideEffectSummary;
};

export type PreferenceUpdateRequest = {
  organizationId: string;
  emailNormalized: string;
  categoryPreferences?: Record<string, boolean>;
  frequencyType?: CommunicationFrequency;
  preferredLanguage?: string | null;
  preferredTimezone?: string | null;
  pauseDays?: number | null;
  pauseUntil?: string | null;
  unsubscribeAll?: boolean;
  source: string;
  idempotencyKey: string;
  ipHash?: string | null;
  userAgentHash?: string | null;
};

export type EligibilityDecision = SuppressionEvaluationResult & {
  categoryBlocked: boolean;
  pauseActive: boolean;
  frequencyBlocked: boolean;
};
