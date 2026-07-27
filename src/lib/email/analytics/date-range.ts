/**
 * Date ranges and comparison periods for email analytics.
 */

export const EMAIL_ANALYTICS_DATE_RANGES = [
  "today",
  "yesterday",
  "last_7_days",
  "last_14_days",
  "last_30_days",
  "last_90_days",
  "month_to_date",
  "previous_month",
  "quarter_to_date",
  "year_to_date",
  "custom",
  "all_time",
] as const;

export type EmailAnalyticsDateRangeKey =
  (typeof EMAIL_ANALYTICS_DATE_RANGES)[number];

export const EMAIL_ANALYTICS_DATE_RANGE_OPTIONS: Array<{
  value: EmailAnalyticsDateRangeKey;
  label: string;
}> = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7_days", label: "Last 7 days" },
  { value: "last_14_days", label: "Last 14 days" },
  { value: "last_30_days", label: "Last 30 days" },
  { value: "last_90_days", label: "Last 90 days" },
  { value: "month_to_date", label: "Month to date" },
  { value: "previous_month", label: "Previous month" },
  { value: "quarter_to_date", label: "Quarter to date" },
  { value: "year_to_date", label: "Year to date" },
  { value: "custom", label: "Custom range" },
  { value: "all_time", label: "All time" },
];

export const EMAIL_COMPARISON_PERIODS = [
  "previous_period",
  "previous_week",
  "previous_month",
  "previous_quarter",
  "previous_year",
  "none",
] as const;

export type EmailComparisonPeriod = (typeof EMAIL_COMPARISON_PERIODS)[number];

export type ResolvedAnalyticsRange = {
  from: Date;
  to: Date;
  label: string;
  previousFrom: Date | null;
  previousTo: Date | null;
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function resolveEmailAnalyticsRange(input: {
  key: EmailAnalyticsDateRangeKey;
  now?: Date;
  customFrom?: string | null;
  customTo?: string | null;
  comparison?: EmailComparisonPeriod;
  maxRangeDays?: number;
}): ResolvedAnalyticsRange {
  const now = input.now ?? new Date();
  const to = endOfDay(now);
  let from = startOfDay(now);
  let label =
    EMAIL_ANALYTICS_DATE_RANGE_OPTIONS.find((o) => o.value === input.key)
      ?.label ?? input.key;

  switch (input.key) {
    case "today":
      break;
    case "yesterday": {
      from.setDate(from.getDate() - 1);
      to.setTime(endOfDay(from).getTime());
      break;
    }
    case "last_7_days":
      from.setDate(from.getDate() - 6);
      break;
    case "last_14_days":
      from.setDate(from.getDate() - 13);
      break;
    case "last_30_days":
      from.setDate(from.getDate() - 29);
      break;
    case "last_90_days":
      from.setDate(from.getDate() - 89);
      break;
    case "month_to_date":
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "previous_month": {
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      to.setTime(endOfDay(end).getTime());
      break;
    }
    case "quarter_to_date": {
      const q = Math.floor(now.getMonth() / 3) * 3;
      from = new Date(now.getFullYear(), q, 1);
      break;
    }
    case "year_to_date":
      from = new Date(now.getFullYear(), 0, 1);
      break;
    case "custom": {
      if (input.customFrom) from = startOfDay(new Date(input.customFrom));
      if (input.customTo) to.setTime(endOfDay(new Date(input.customTo)).getTime());
      label = "Custom range";
      break;
    }
    case "all_time":
      from = new Date("2000-01-01T00:00:00.000Z");
      label = "All time";
      break;
  }

  const maxDays =
    input.maxRangeDays ??
    Number(process.env.EMAIL_ANALYTICS_MAX_RANGE_DAYS ?? 366);
  if (Number.isFinite(maxDays) && maxDays > 0 && input.key !== "all_time") {
    const maxMs = maxDays * 24 * 60 * 60 * 1000;
    if (to.getTime() - from.getTime() > maxMs) {
      from = new Date(to.getTime() - maxMs);
      from = startOfDay(from);
    }
  }

  const comparison = input.comparison ?? "previous_period";
  let previousFrom: Date | null = null;
  let previousTo: Date | null = null;

  if (comparison !== "none") {
    const duration = Math.max(1, to.getTime() - from.getTime());
    if (comparison === "previous_period") {
      previousTo = new Date(from.getTime() - 1);
      previousFrom = new Date(previousTo.getTime() - duration);
    } else if (comparison === "previous_week") {
      previousFrom = new Date(from);
      previousFrom.setDate(previousFrom.getDate() - 7);
      previousTo = new Date(to);
      previousTo.setDate(previousTo.getDate() - 7);
    } else if (comparison === "previous_month") {
      previousFrom = new Date(from);
      previousFrom.setMonth(previousFrom.getMonth() - 1);
      previousTo = new Date(to);
      previousTo.setMonth(previousTo.getMonth() - 1);
    } else if (comparison === "previous_quarter") {
      previousFrom = new Date(from);
      previousFrom.setMonth(previousFrom.getMonth() - 3);
      previousTo = new Date(to);
      previousTo.setMonth(previousTo.getMonth() - 3);
    } else if (comparison === "previous_year") {
      previousFrom = new Date(from);
      previousFrom.setFullYear(previousFrom.getFullYear() - 1);
      previousTo = new Date(to);
      previousTo.setFullYear(previousTo.getFullYear() - 1);
    }
  }

  return { from, to, label, previousFrom, previousTo };
}

export function inAnalyticsRange(
  iso: string | null | undefined,
  from: Date,
  to: Date,
): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= from.getTime() && t <= to.getTime();
}
