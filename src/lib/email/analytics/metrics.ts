/**
 * Phase 21J — centralized metric registry.
 * One definition → one formula across dashboard, detail pages, and exports.
 */

export type MetricCategory =
  | "delivery"
  | "engagement"
  | "reply"
  | "suppression"
  | "sequence"
  | "commercial"
  | "operational";

export type MetricUnit = "count" | "rate" | "currency" | "duration_ms" | "ratio";

export type AnalyticsMetricDefinition = {
  code: string;
  name: string;
  description: string;
  category: MetricCategory;
  unit: MetricUnit;
  numerator?: string;
  denominator?: string;
  higherIsBetter: boolean;
  operational: boolean;
  commercial: boolean;
  estimated: boolean;
  formula: string;
};

export const ANALYTICS_METRICS: readonly AnalyticsMetricDefinition[] = [
  {
    code: "messages_sent",
    name: "Sent",
    description: "Messages accepted by the provider for delivery.",
    category: "delivery",
    unit: "count",
    higherIsBetter: true,
    operational: true,
    commercial: false,
    estimated: false,
    formula: "count(email_queue status in sent/delivered/opened/clicked/replied) + delivery sent",
  },
  {
    code: "messages_delivered",
    name: "Delivered",
    description: "Messages with confirmed provider delivery events.",
    category: "delivery",
    unit: "count",
    higherIsBetter: true,
    operational: true,
    commercial: false,
    estimated: false,
    formula: "count(delivery_status = delivered)",
  },
  {
    code: "delivery_rate",
    name: "Delivery Rate",
    description: "Delivered / sent.",
    category: "delivery",
    unit: "rate",
    numerator: "messages_delivered",
    denominator: "messages_sent",
    higherIsBetter: true,
    operational: true,
    commercial: false,
    estimated: false,
    formula: "delivered / sent",
  },
  {
    code: "soft_bounce_rate",
    name: "Soft-Bounce Rate",
    description: "Soft bounces / sent.",
    category: "delivery",
    unit: "rate",
    numerator: "soft_bounces",
    denominator: "messages_sent",
    higherIsBetter: false,
    operational: true,
    commercial: false,
    estimated: false,
    formula: "soft_bounces / sent",
  },
  {
    code: "hard_bounce_rate",
    name: "Hard-Bounce Rate",
    description: "Hard bounces / sent.",
    category: "delivery",
    unit: "rate",
    numerator: "hard_bounces",
    denominator: "messages_sent",
    higherIsBetter: false,
    operational: true,
    commercial: false,
    estimated: false,
    formula: "hard_bounces / sent",
  },
  {
    code: "complaint_rate",
    name: "Complaint Rate",
    description: "Complaints / delivered-or-sent.",
    category: "suppression",
    unit: "rate",
    numerator: "complaints",
    denominator: "messages_delivered",
    higherIsBetter: false,
    operational: true,
    commercial: false,
    estimated: false,
    formula: "complaints / delivered_or_sent",
  },
  {
    code: "unsubscribe_rate",
    name: "Unsubscribe Rate",
    description: "Global unsubscribes / delivered-or-sent.",
    category: "suppression",
    unit: "rate",
    numerator: "unsubscribes",
    denominator: "messages_delivered",
    higherIsBetter: false,
    operational: true,
    commercial: false,
    estimated: false,
    formula: "unsubscribes / delivered_or_sent",
  },
  {
    code: "unique_opens",
    name: "Unique Opens",
    description: "Messages with at least one open event (raw open tracking).",
    category: "engagement",
    unit: "count",
    higherIsBetter: true,
    operational: true,
    commercial: false,
    estimated: true,
    formula: "count(engagement unique_open_count > 0)",
  },
  {
    code: "unique_human_opens",
    name: "Likely Human Opens",
    description:
      "Unique opens excluding known proxy/bot patterns when classification exists; falls back to unique opens with a data-quality warning.",
    category: "engagement",
    unit: "count",
    higherIsBetter: true,
    operational: true,
    commercial: false,
    estimated: true,
    formula: "unique_opens - proxy_opens (fallback: unique_opens)",
  },
  {
    code: "unique_clicks",
    name: "Unique Clicks",
    description: "Messages with at least one click event.",
    category: "engagement",
    unit: "count",
    higherIsBetter: true,
    operational: true,
    commercial: false,
    estimated: true,
    formula: "count(engagement unique_click_count > 0)",
  },
  {
    code: "unique_human_clicks",
    name: "Likely Human Clicks",
    description:
      "Unique clicks excluding security-scanner patterns when available; otherwise unique clicks with warning.",
    category: "engagement",
    unit: "count",
    higherIsBetter: true,
    operational: true,
    commercial: false,
    estimated: true,
    formula: "unique_clicks - scanner_clicks (fallback: unique_clicks)",
  },
  {
    code: "ctr",
    name: "Click-Through Rate",
    description: "Unique human clicks / delivered-or-sent.",
    category: "engagement",
    unit: "rate",
    numerator: "unique_human_clicks",
    denominator: "messages_delivered",
    higherIsBetter: true,
    operational: true,
    commercial: false,
    estimated: true,
    formula: "unique_human_clicks / delivered_or_sent",
  },
  {
    code: "ctor",
    name: "Click-to-Open Rate",
    description: "Unique human clicks / unique human opens.",
    category: "engagement",
    unit: "rate",
    numerator: "unique_human_clicks",
    denominator: "unique_human_opens",
    higherIsBetter: true,
    operational: true,
    commercial: false,
    estimated: true,
    formula: "unique_human_clicks / unique_human_opens",
  },
  {
    code: "human_replies",
    name: "Human Replies",
    description: "Messages with at least one reply engagement event.",
    category: "reply",
    unit: "count",
    higherIsBetter: true,
    operational: true,
    commercial: true,
    estimated: false,
    formula: "count(engagement reply_count > 0)",
  },
  {
    code: "human_reply_rate",
    name: "Human Reply Rate",
    description: "Human replies / delivered-or-sent.",
    category: "reply",
    unit: "rate",
    numerator: "human_replies",
    denominator: "messages_delivered",
    higherIsBetter: true,
    operational: true,
    commercial: true,
    estimated: false,
    formula: "human_replies / delivered_or_sent",
  },
  {
    code: "confirmed_revenue",
    name: "Confirmed Revenue",
    description: "Sum of deal-linked attribution with confirmed confidence. No double-counting of the same deal.",
    category: "commercial",
    unit: "currency",
    higherIsBetter: true,
    operational: false,
    commercial: true,
    estimated: false,
    formula: "sum(attribution revenue where confidence=confirmed) distinct deal",
  },
  {
    code: "estimated_revenue",
    name: "Estimated Revenue",
    description: "Attributed revenue marked estimated/influenced. Not mixed into confirmed totals.",
    category: "commercial",
    unit: "currency",
    higherIsBetter: true,
    operational: false,
    commercial: true,
    estimated: true,
    formula: "sum(attribution revenue where confidence in estimated|influenced)",
  },
  {
    code: "roi",
    name: "ROI",
    description: "(Confirmed revenue - known costs) / known costs. Null when costs incomplete.",
    category: "commercial",
    unit: "ratio",
    higherIsBetter: true,
    operational: false,
    commercial: true,
    estimated: true,
    formula: "(confirmed_revenue - known_costs) / known_costs",
  },
] as const;

export const METRIC_BY_CODE = Object.fromEntries(
  ANALYTICS_METRICS.map((m) => [m.code, m]),
) as Record<string, AnalyticsMetricDefinition>;

export function getMetricDefinition(code: string): AnalyticsMetricDefinition | null {
  return METRIC_BY_CODE[code] ?? null;
}

export function ratePct(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 10000) / 100;
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) {
    if (current === 0) return 0;
    return null; // avoid infinite % when previous is zero
  }
  return Math.round(((current - previous) / Math.abs(previous)) * 10000) / 100;
}

export function absoluteChange(current: number, previous: number): number {
  return current - previous;
}
