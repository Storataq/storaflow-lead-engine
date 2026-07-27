/**
 * Tracking engine — open/click/reply instrumentation and handlers.
 */

export type TrackingCapabilities = {
  openTracking: true;
  clickTracking: true;
  replyTracking: true;
  bounceWebhooks: true;
  complaintWebhooks: true;
  unsubscribeLinks: true;
};

export const TRACKING_CAPABILITIES: TrackingCapabilities = {
  openTracking: true,
  clickTracking: true,
  replyTracking: true,
  bounceWebhooks: true,
  complaintWebhooks: true,
  unsubscribeLinks: true,
};

export const TRACKING_FUTURE_HOOKS = [
  "Bot / privacy proxy filtering rules for open tracking",
  "Provider-native click/open reconciliation",
  "Full GDPR export and erasure workflows",
] as const;

export {
  prepareTrackedMessage,
} from "@/lib/email/tracking/instrument";
export {
  getEngagementOverview,
  listRecentTrackingEvents,
} from "@/lib/email/tracking/queries";
export {
  getQueueRowForOpenTracking,
  recordReplyFromReceivedWebhook,
  getTrackingLinkByToken,
  recordEngagementEvent,
} from "@/lib/email/tracking/process";
export {
  buildTrackedReplyToAddress,
  createOpenTrackingToken,
  parseTrackedReplyToAddress,
  verifyOpenTrackingToken,
} from "@/lib/email/tracking/tokens";
