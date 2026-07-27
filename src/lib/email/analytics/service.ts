/**
 * Shared analytics query service — Phase 21J.
 * One calculation path for dashboard, drilldowns, and exports.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createServiceClient } from "@/lib/supabase/admin";
import {
  absoluteChange,
  percentChange,
  ratePct,
  getMetricDefinition,
} from "@/lib/email/analytics/metrics";
import {
  inAnalyticsRange,
  resolveEmailAnalyticsRange,
  type EmailAnalyticsDateRangeKey,
  type EmailComparisonPeriod,
  type ResolvedAnalyticsRange,
} from "@/lib/email/analytics/date-range";
import { deriveAnalyticsRates } from "@/lib/email/analytics/index";

type SupabaseLike = any;

export type AnalyticsWarning = {
  code: string;
  message: string;
  severity: "informational" | "warning" | "high_priority";
};

export type KpiValue = {
  code: string;
  label: string;
  value: number | null;
  previous: number | null;
  absoluteChange: number | null;
  percentChange: number | null;
  unit: "count" | "rate" | "currency" | "ratio" | "duration_ms";
  higherIsBetter: boolean;
  estimated: boolean;
  definition: string;
};

export type CampaignAnalyticsRow = {
  campaignId: string;
  name: string;
  status: string;
  sent: number;
  delivered: number;
  uniqueOpens: number;
  uniqueClicks: number;
  replies: number;
  hardBounces: number;
  complaints: number;
  unsubscribes: number;
  deliveryRate: number | null;
  replyRate: number | null;
  confirmedRevenue: number;
};

export type SequenceStepDropOff = {
  stepId: string;
  stepNumber: number;
  stepType: string;
  entered: number;
  completed: number;
  stopped: number;
  failed: number;
  dropOffRate: number | null;
};

export type EmailAnalyticsDashboard = {
  range: ResolvedAnalyticsRange;
  kpis: KpiValue[];
  delivery: Record<string, number>;
  engagement: Record<string, number>;
  campaigns: CampaignAnalyticsRow[];
  sequenceDropOff: SequenceStepDropOff[];
  funnel: Array<{ stage: string; count: number; rateFromPrevious: number | null }>;
  timeSeries: Array<{ date: string; sent: number; delivered: number; replies: number }>;
  heatmap: Array<{ day: number; hour: number; replies: number }>;
  insights: Array<{
    code: string;
    title: string;
    explanation: string;
    severity: string;
    confidence: string;
  }>;
  warnings: AnalyticsWarning[];
  attribution: {
    confirmedRevenue: number;
    estimatedRevenue: number;
    model: string;
    dealCount: number;
  };
  roi: {
    knownCosts: number | null;
    confirmedRevenue: number;
    roi: number | null;
    incompleteCosts: boolean;
    currency: string;
  };
  sampleSize: number;
};

function minSample(): number {
  const n = Number(process.env.EMAIL_ANALYTICS_MIN_SAMPLE_SIZE ?? 20);
  return Number.isFinite(n) && n > 0 ? n : 20;
}

function kpi(
  code: string,
  value: number | null,
  previous: number | null,
): KpiValue {
  const def = getMetricDefinition(code);
  return {
    code,
    label: def?.name ?? code,
    value,
    previous,
    absoluteChange:
      value != null && previous != null ? absoluteChange(value, previous) : null,
    percentChange:
      value != null && previous != null ? percentChange(value, previous) : null,
    unit: def?.unit ?? "count",
    higherIsBetter: def?.higherIsBetter ?? true,
    estimated: def?.estimated ?? false,
    definition: def?.description ?? "",
  };
}

async function loadOrgRows(organizationId: string) {
  const supabase = createServiceClient() as SupabaseLike;
  const [
    deliveries,
    engagements,
    executions,
    campaigns,
    unsubs,
    trackingEvents,
    costSettings,
    attributions,
    enrollments,
    stepExecs,
  ] = await Promise.all([
    supabase
      .from("email_message_delivery_status")
      .select("*")
      .eq("organization_id", organizationId),
    supabase
      .from("email_message_engagement_status")
      .select("*")
      .eq("organization_id", organizationId),
    supabase
      .from("email_campaign_executions")
      .select("*")
      .eq("organization_id", organizationId),
    supabase
      .from("email_campaigns")
      .select("id, name, status, analytics_fixed_cost, analytics_cost_currency")
      .eq("organization_id", organizationId),
    supabase
      .from("email_unsubscribe_events")
      .select("id, created_at, campaign_id, scope")
      .eq("organization_id", organizationId),
    supabase
      .from("email_tracking_events")
      .select("id, event_type, occurred_at, campaign_execution_id, metadata_json")
      .eq("organization_id", organizationId)
      .eq("event_type", "replied"),
    supabase
      .from("email_cost_settings")
      .select("*")
      .eq("organization_id", organizationId)
      .maybeSingle(),
    supabase
      .from("email_attribution_records")
      .select("*")
      .eq("organization_id", organizationId),
    supabase
      .from("email_sequence_enrollments")
      .select("id, status, created_at, campaign_execution_id, sequence_id")
      .eq("organization_id", organizationId),
    supabase
      .from("email_step_executions")
      .select(
        "id, status, step_number, step_type, sequence_step_id, campaign_execution_id, created_at, completed_at",
      )
      .eq("organization_id", organizationId),
  ]);

  return {
    deliveries: (deliveries.data ?? []) as any[],
    engagements: (engagements.data ?? []) as any[],
    executions: (executions.data ?? []) as any[],
    campaigns: (campaigns.data ?? []) as any[],
    unsubs: (unsubs.data ?? []) as any[],
    trackingEvents: (trackingEvents.data ?? []) as any[],
    costSettings: costSettings.data as any,
    attributions: (attributions.data ?? []) as any[],
    enrollments: (enrollments.data ?? []) as any[],
    stepExecs: (stepExecs.data ?? []) as any[],
  };
}

function summarizeWindow(input: {
  deliveries: any[];
  engagements: any[];
  unsubs: any[];
  from: Date;
  to: Date;
  campaignId?: string | null;
}) {
  const deliveries = input.deliveries.filter((d) => {
    if (input.campaignId && d.campaign_id !== input.campaignId) return false;
    const ts = d.sent_at ?? d.delivered_at ?? d.latest_event_at ?? d.created_at;
    return inAnalyticsRange(ts, input.from, input.to);
  });
  const engagements = input.engagements.filter((e) => {
    if (input.campaignId && e.campaign_id !== input.campaignId) return false;
    const ts =
      e.last_opened_at ??
      e.last_clicked_at ??
      e.replied_at ??
      e.created_at;
    return inAnalyticsRange(ts, input.from, input.to) || deliveries.some((d) => d.queue_item_id === e.queue_item_id);
  });
  const unsubs = input.unsubs.filter((u) => {
    if (input.campaignId && u.campaign_id !== input.campaignId) return false;
    return inAnalyticsRange(u.created_at, input.from, input.to);
  });

  let sent = 0;
  let delivered = 0;
  let delayed = 0;
  let soft = 0;
  let hard = 0;
  let complained = 0;
  let rejected = 0;
  let failed = 0;

  for (const d of deliveries) {
    const s = d.current_status;
    if (["sent", "delivered", "delayed", "soft_bounced", "hard_bounced", "complained", "opened", "clicked", "replied"].includes(s) || d.sent_at) {
      sent += 1;
    }
    if (s === "delivered") delivered += 1;
    if (s === "delayed") delayed += 1;
    if (s === "soft_bounced") soft += 1;
    if (s === "hard_bounced") hard += 1;
    if (s === "complained") complained += 1;
    if (s === "rejected") rejected += 1;
    if (s === "failed") failed += 1;
  }

  let uniqueOpens = 0;
  let uniqueClicks = 0;
  let replies = 0;
  let totalOpens = 0;
  let totalClicks = 0;

  for (const e of engagements) {
    totalOpens += e.total_open_count ?? 0;
    totalClicks += e.total_click_count ?? 0;
    if ((e.unique_open_count ?? 0) > 0 || (e.total_open_count ?? 0) > 0) uniqueOpens += 1;
    if ((e.unique_click_count ?? 0) > 0 || (e.total_click_count ?? 0) > 0) uniqueClicks += 1;
    if ((e.reply_count ?? 0) > 0) replies += 1;
  }

  const deliveredOrSent = delivered || sent;
  void deliveredOrSent;
  const rates = deriveAnalyticsRates({
    organizationId: "",
    campaignId: input.campaignId ?? null,
    sent,
    delivered,
    opened: uniqueOpens,
    clicked: uniqueClicks,
    replied: replies,
    bounced: soft + hard,
    complaints: complained,
    unsubscribed: unsubs.length,
  });

  return {
    sent,
    delivered,
    delayed,
    soft,
    hard,
    complained,
    rejected,
    failed,
    uniqueOpens,
    uniqueClicks,
    replies,
    totalOpens,
    totalClicks,
    unsubscribes: unsubs.length,
    deliveryRate: ratePct(delivered, sent),
    softBounceRate: ratePct(soft, sent),
    hardBounceRate: ratePct(hard, sent),
    complaintRate: rates.complaintRate,
    unsubscribeRate: rates.unsubscribeRate,
    openRate: rates.openRate,
    clickRate: rates.clickRate,
    replyRate: rates.replyRate,
    ctr: rates.ctr,
    ctor: rates.ctor,
    sampleSize: sent,
  };
}

function buildWarnings(sampleSize: number, summary: ReturnType<typeof summarizeWindow>): AnalyticsWarning[] {
  const warnings: AnalyticsWarning[] = [];
  if (sampleSize < minSample()) {
    warnings.push({
      code: "small_sample_size",
      message: `Sample size (${sampleSize}) is below the configured minimum (${minSample()}). Rates may be unreliable.`,
      severity: "warning",
    });
  }
  warnings.push({
    code: "open_tracking_uncertainty",
    message:
      "Open metrics can be inflated by privacy proxies. Prefer reply metrics for commercial decisions.",
    severity: "informational",
  });
  if (summary.uniqueClicks > 0) {
    warnings.push({
      code: "click_scanner_uncertainty",
      message:
        "Click metrics may include security-scanner hits. Likely-human clicks currently fall back to unique clicks.",
      severity: "informational",
    });
  }
  return warnings;
}

function generateInsights(input: {
  current: ReturnType<typeof summarizeWindow>;
  previous: ReturnType<typeof summarizeWindow> | null;
  campaigns: CampaignAnalyticsRow[];
}): EmailAnalyticsDashboard["insights"] {
  const insights: EmailAnalyticsDashboard["insights"] = [];
  const { current, previous } = input;

  if (previous && previous.sent >= minSample() && current.sent >= minSample()) {
    if (
      current.deliveryRate != null &&
      previous.deliveryRate != null &&
      current.deliveryRate < previous.deliveryRate - 5
    ) {
      insights.push({
        code: "delivery_rate_drop",
        title: "Delivery rate decreased",
        explanation: `Delivery rate moved from ${previous.deliveryRate}% to ${current.deliveryRate}% versus the comparison period.`,
        severity: "high_priority",
        confidence: "medium",
      });
    }
    if (
      current.hardBounceRate != null &&
      previous.hardBounceRate != null &&
      current.hardBounceRate > previous.hardBounceRate + 2
    ) {
      insights.push({
        code: "hard_bounce_spike",
        title: "Hard-bounce rate increased",
        explanation: `Hard-bounce rate rose from ${previous.hardBounceRate}% to ${current.hardBounceRate}%. Review list quality and suppressions.`,
        severity: "critical",
        confidence: "medium",
      });
    }
    if (
      current.complaintRate != null &&
      previous.complaintRate != null &&
      current.complaintRate > previous.complaintRate + 0.5
    ) {
      insights.push({
        code: "complaint_spike",
        title: "Complaint rate increased",
        explanation: `Complaint rate rose from ${previous.complaintRate}% to ${current.complaintRate}%. This is correlation, not proven causation.`,
        severity: "critical",
        confidence: "medium",
      });
    }
  }

  const topComplaint = [...input.campaigns].sort(
    (a, b) => b.complaints - a.complaints,
  )[0];
  if (topComplaint && topComplaint.complaints > 0 && topComplaint.sent >= minSample()) {
    insights.push({
      code: "campaign_complaint_concentration",
      title: "Complaints concentrated in one campaign",
      explanation: `Campaign “${topComplaint.name}” accounts for ${topComplaint.complaints} complaint(s) in this range.`,
      severity: "warning",
      confidence: "low",
    });
  }

  if (current.replies === 0 && current.sent >= minSample()) {
    insights.push({
      code: "no_replies",
      title: "No human replies in range",
      explanation:
        "No reply events were recorded. Check reply tracking configuration and sample composition.",
      severity: "informational",
      confidence: "high",
    });
  }

  return insights;
}

export async function buildEmailAnalyticsDashboard(input: {
  organizationId: string;
  rangeKey?: EmailAnalyticsDateRangeKey;
  customFrom?: string | null;
  customTo?: string | null;
  comparison?: EmailComparisonPeriod;
  campaignId?: string | null;
  includeRevenue?: boolean;
}): Promise<EmailAnalyticsDashboard> {
  const defaultDays = Number(
    process.env.EMAIL_ANALYTICS_DEFAULT_RANGE_DAYS ?? 30,
  );
  const rangeKey =
    input.rangeKey ??
    (defaultDays <= 7
      ? "last_7_days"
      : defaultDays <= 14
        ? "last_14_days"
        : defaultDays <= 30
          ? "last_30_days"
          : "last_90_days");

  const range = resolveEmailAnalyticsRange({
    key: rangeKey,
    customFrom: input.customFrom,
    customTo: input.customTo,
    comparison: input.comparison ?? "previous_period",
  });

  const rows = await loadOrgRows(input.organizationId);
  const current = summarizeWindow({
    deliveries: rows.deliveries,
    engagements: rows.engagements,
    unsubs: rows.unsubs,
    from: range.from,
    to: range.to,
    campaignId: input.campaignId,
  });
  const previous =
    range.previousFrom && range.previousTo
      ? summarizeWindow({
          deliveries: rows.deliveries,
          engagements: rows.engagements,
          unsubs: rows.unsubs,
          from: range.previousFrom,
          to: range.previousTo,
          campaignId: input.campaignId,
        })
      : null;

  const campaignMap = new Map(
    rows.campaigns.map((c) => [c.id as string, c.name as string]),
  );
  const campaignStatus = new Map(
    rows.campaigns.map((c) => [c.id as string, c.status as string]),
  );

  const campaigns: CampaignAnalyticsRow[] = [];
  for (const campaign of rows.campaigns) {
    if (input.campaignId && campaign.id !== input.campaignId) continue;
    const summary = summarizeWindow({
      deliveries: rows.deliveries,
      engagements: rows.engagements,
      unsubs: rows.unsubs,
      from: range.from,
      to: range.to,
      campaignId: campaign.id,
    });
    if (summary.sent === 0 && summary.replies === 0) continue;

    const confirmedRevenue = rows.attributions
      .filter(
        (a) =>
          a.campaign_id === campaign.id &&
          a.attribution_confidence === "confirmed" &&
          inAnalyticsRange(a.attributed_at, range.from, range.to),
      )
      .reduce((sum: number, a: any) => sum + Number(a.revenue_amount ?? 0), 0);

    campaigns.push({
      campaignId: campaign.id,
      name: campaign.name,
      status: campaign.status,
      sent: summary.sent,
      delivered: summary.delivered,
      uniqueOpens: summary.uniqueOpens,
      uniqueClicks: summary.uniqueClicks,
      replies: summary.replies,
      hardBounces: summary.hard,
      complaints: summary.complained,
      unsubscribes: summary.unsubscribes,
      deliveryRate: summary.deliveryRate,
      replyRate: summary.replyRate,
      confirmedRevenue,
    });
  }

  campaigns.sort((a, b) => b.replies - a.replies || b.sent - a.sent);

  // Sequence step drop-off (aggregate by step_number)
  const stepBuckets = new Map<string, SequenceStepDropOff>();
  for (const step of rows.stepExecs) {
    const ts = step.completed_at ?? step.created_at;
    if (!inAnalyticsRange(ts, range.from, range.to)) continue;
    if (input.campaignId) {
      const exec = rows.executions.find((e) => e.id === step.campaign_execution_id);
      if (!exec || exec.campaign_id !== input.campaignId) continue;
    }
    const key = `${step.step_number}:${step.step_type}:${step.sequence_step_id ?? ""}`;
    const existing = stepBuckets.get(key) ?? {
      stepId: step.sequence_step_id ?? key,
      stepNumber: step.step_number ?? 0,
      stepType: step.step_type ?? "unknown",
      entered: 0,
      completed: 0,
      stopped: 0,
      failed: 0,
      dropOffRate: null,
    };
    existing.entered += 1;
    if (step.status === "completed") existing.completed += 1;
    if (step.status === "stopped") existing.stopped += 1;
    if (step.status === "failed") existing.failed += 1;
    stepBuckets.set(key, existing);
  }
  const sequenceDropOff = [...stepBuckets.values()]
    .map((s) => ({
      ...s,
      dropOffRate: ratePct(s.stopped + s.failed, s.entered),
    }))
    .sort((a, b) => a.stepNumber - b.stepNumber);

  const enrolled = rows.enrollments.filter((e) =>
    inAnalyticsRange(e.created_at, range.from, range.to),
  ).length;

  const funnel = [
    { stage: "Enrolled", count: enrolled },
    { stage: "Sent", count: current.sent },
    { stage: "Delivered", count: current.delivered },
    { stage: "Engaged (human click/reply)", count: Math.max(current.uniqueClicks, current.replies) },
    { stage: "Replied", count: current.replies },
  ].map((stage, idx, arr) => ({
    ...stage,
    rateFromPrevious:
      idx === 0 ? null : ratePct(stage.count, arr[idx - 1]?.count ?? 0),
  }));

  // Daily time series from delivery sent_at
  const dayMap = new Map<string, { sent: number; delivered: number; replies: number }>();
  for (const d of rows.deliveries) {
    const ts = d.sent_at ?? d.delivered_at ?? d.created_at;
    if (!inAnalyticsRange(ts, range.from, range.to)) continue;
    if (input.campaignId && d.campaign_id !== input.campaignId) continue;
    const day = new Date(ts).toISOString().slice(0, 10);
    const bucket = dayMap.get(day) ?? { sent: 0, delivered: 0, replies: 0 };
    bucket.sent += 1;
    if (d.current_status === "delivered") bucket.delivered += 1;
    dayMap.set(day, bucket);
  }
  for (const e of rows.engagements) {
    if (!e.replied_at) continue;
    if (!inAnalyticsRange(e.replied_at, range.from, range.to)) continue;
    if (input.campaignId && e.campaign_id !== input.campaignId) continue;
    const day = new Date(e.replied_at).toISOString().slice(0, 10);
    const bucket = dayMap.get(day) ?? { sent: 0, delivered: 0, replies: 0 };
    if ((e.reply_count ?? 0) > 0) bucket.replies += 1;
    dayMap.set(day, bucket);
  }
  const timeSeries = [...dayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  // Reply heatmap by day/hour (UTC)
  const heatMap = new Map<string, number>();
  for (const e of rows.engagements) {
    if (!e.replied_at || (e.reply_count ?? 0) <= 0) continue;
    if (!inAnalyticsRange(e.replied_at, range.from, range.to)) continue;
    const dt = new Date(e.replied_at);
    const key = `${dt.getUTCDay()}:${dt.getUTCHours()}`;
    heatMap.set(key, (heatMap.get(key) ?? 0) + 1);
  }
  const heatmap = [...heatMap.entries()].map(([key, replies]) => {
    const [day, hour] = key.split(":").map(Number);
    return { day, hour, replies };
  });

  const confirmedDealIds = new Set<string>();
  let confirmedRevenue = 0;
  let estimatedRevenue = 0;
  for (const a of rows.attributions) {
    if (!inAnalyticsRange(a.attributed_at, range.from, range.to)) continue;
    if (input.campaignId && a.campaign_id !== input.campaignId) continue;
    const amount = Number(a.revenue_amount ?? 0);
    if (a.attribution_confidence === "confirmed") {
      const dealKey = a.deal_id ?? a.id;
      if (!confirmedDealIds.has(dealKey)) {
        confirmedDealIds.add(dealKey);
        confirmedRevenue += amount;
      }
    } else {
      estimatedRevenue += amount;
    }
  }

  const currency = rows.costSettings?.currency ?? "EUR";
  const providerCostPerThousand = Number(
    rows.costSettings?.provider_cost_per_thousand ?? 0,
  );
  const campaignFixed = rows.campaigns.reduce(
    (sum: number, c: any) => sum + Number(c.analytics_fixed_cost ?? 0),
    0,
  );
  const knownCostsParts: number[] = [];
  let incompleteCosts = !rows.costSettings;
  if (rows.costSettings) {
    if (providerCostPerThousand > 0) {
      knownCostsParts.push((current.sent / 1000) * providerCostPerThousand);
    } else {
      incompleteCosts = true;
    }
    if (campaignFixed > 0) knownCostsParts.push(campaignFixed);
  }
  const knownCosts =
    knownCostsParts.length > 0
      ? knownCostsParts.reduce((a, b) => a + b, 0)
      : null;
  const roi =
    knownCosts != null && knownCosts > 0
      ? Math.round(((confirmedRevenue - knownCosts) / knownCosts) * 10000) / 10000
      : null;

  const warnings = buildWarnings(current.sampleSize, current);
  if (incompleteCosts || knownCosts == null) {
    warnings.push({
      code: "incomplete_cost_data",
      message:
        "ROI is incomplete because organization cost settings are missing or partial.",
      severity: "warning",
    });
  }
  if (confirmedRevenue === 0 && estimatedRevenue === 0) {
    warnings.push({
      code: "missing_revenue_links",
      message:
        "No attribution records found. Link won deals to campaigns to populate confirmed revenue.",
      severity: "informational",
    });
  }

  void campaignMap;
  void campaignStatus;

  const attributionModel =
    process.env.EMAIL_ANALYTICS_ATTRIBUTION_MODEL?.trim() || "last_touch";

  const insights = generateInsights({
    current,
    previous,
    campaigns,
  });

  return {
    range,
    kpis: [
      kpi("messages_sent", current.sent, previous?.sent ?? null),
      kpi("messages_delivered", current.delivered, previous?.delivered ?? null),
      kpi("delivery_rate", current.deliveryRate, previous?.deliveryRate ?? null),
      kpi("unique_human_opens", current.uniqueOpens, previous?.uniqueOpens ?? null),
      kpi("unique_human_clicks", current.uniqueClicks, previous?.uniqueClicks ?? null),
      kpi("human_replies", current.replies, previous?.replies ?? null),
      kpi("human_reply_rate", current.replyRate, previous?.replyRate ?? null),
      kpi("complaint_rate", current.complaintRate, previous?.complaintRate ?? null),
      kpi("unsubscribe_rate", current.unsubscribeRate, previous?.unsubscribeRate ?? null),
      kpi(
        "confirmed_revenue",
        input.includeRevenue === false ? null : confirmedRevenue,
        null,
      ),
    ],
    delivery: {
      sent: current.sent,
      delivered: current.delivered,
      delayed: current.delayed,
      softBounces: current.soft,
      hardBounces: current.hard,
      complaints: current.complained,
      rejected: current.rejected,
      failed: current.failed,
    },
    engagement: {
      totalOpens: current.totalOpens,
      uniqueOpens: current.uniqueOpens,
      likelyHumanOpens: current.uniqueOpens,
      proxyOpens: 0,
      totalClicks: current.totalClicks,
      uniqueClicks: current.uniqueClicks,
      likelyHumanClicks: current.uniqueClicks,
      scannerClicks: 0,
      humanReplies: current.replies,
      ctr: current.ctr ?? 0,
      ctor: current.ctor ?? 0,
    },
    campaigns,
    sequenceDropOff,
    funnel,
    timeSeries,
    heatmap,
    insights,
    warnings,
    attribution: {
      confirmedRevenue,
      estimatedRevenue,
      model: attributionModel,
      dealCount: confirmedDealIds.size,
    },
    roi: {
      knownCosts,
      confirmedRevenue,
      roi,
      incompleteCosts,
      currency,
    },
    sampleSize: current.sampleSize,
  };
}

export function exportAnalyticsCsv(dashboard: EmailAnalyticsDashboard): string {
  const lines = [
    "section,key,value",
    ...dashboard.kpis.map(
      (k) =>
        `kpi,${k.code},${k.value ?? ""},${k.previous ?? ""},${k.percentChange ?? ""}`,
    ),
    ...Object.entries(dashboard.delivery).map(
      ([k, v]) => `delivery,${k},${v}`,
    ),
    ...Object.entries(dashboard.engagement).map(
      ([k, v]) => `engagement,${k},${v}`,
    ),
    ...dashboard.campaigns.map(
      (c) =>
        `campaign,${JSON.stringify(c.name)},sent=${c.sent};delivered=${c.delivered};replies=${c.replies};revenue=${c.confirmedRevenue}`,
    ),
    ...dashboard.warnings.map((w) => `warning,${w.code},${JSON.stringify(w.message)}`),
  ];
  return lines.join("\n");
}
