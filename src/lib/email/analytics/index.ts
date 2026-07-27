/**
 * Analytics foundation — rate helpers only (no live aggregation pipeline).
 */

import type { EmailAnalyticsSnapshot } from "@/lib/email/types";

function rate(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 10000) / 100;
}

export function buildEmptyAnalyticsSnapshot(input: {
  organizationId: string;
  campaignId?: string | null;
}): EmailAnalyticsSnapshot {
  return {
    organizationId: input.organizationId,
    campaignId: input.campaignId ?? null,
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    replied: 0,
    bounced: 0,
    complaints: 0,
    unsubscribed: 0,
    openRate: null,
    clickRate: null,
    replyRate: null,
    bounceRate: null,
    complaintRate: null,
    unsubscribeRate: null,
    ctr: null,
    ctor: null,
    calculatedAt: new Date().toISOString(),
  };
}

export function deriveAnalyticsRates(
  snapshot: Omit<
    EmailAnalyticsSnapshot,
    | "openRate"
    | "clickRate"
    | "replyRate"
    | "bounceRate"
    | "complaintRate"
    | "unsubscribeRate"
    | "ctr"
    | "ctor"
    | "calculatedAt"
  >,
): Pick<
  EmailAnalyticsSnapshot,
  | "openRate"
  | "clickRate"
  | "replyRate"
  | "bounceRate"
  | "complaintRate"
  | "unsubscribeRate"
  | "ctr"
  | "ctor"
> {
  const deliveredOrSent = snapshot.delivered || snapshot.sent;
  return {
    openRate: rate(snapshot.opened, deliveredOrSent),
    clickRate: rate(snapshot.clicked, deliveredOrSent),
    replyRate: rate(snapshot.replied, deliveredOrSent),
    bounceRate: rate(snapshot.bounced, snapshot.sent),
    complaintRate: rate(snapshot.complaints, deliveredOrSent),
    unsubscribeRate: rate(snapshot.unsubscribed, deliveredOrSent),
    ctr: rate(snapshot.clicked, deliveredOrSent),
    ctor: rate(snapshot.clicked, snapshot.opened),
  };
}
