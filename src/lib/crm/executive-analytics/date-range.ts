/**
 * Phase 25G — date ranges for executive analytics.
 * Aligned with email analytics presets; extended for executive filters.
 */

export const EXEC_DATE_RANGES = [
  "today",
  "yesterday",
  "last_7_days",
  "last_30_days",
  "this_month",
  "last_month",
  "this_quarter",
  "this_year",
  "custom",
] as const;

export type ExecDateRangeKey = (typeof EXEC_DATE_RANGES)[number];

export const EXEC_DATE_RANGE_OPTIONS: Array<{
  value: ExecDateRangeKey;
  label: string;
}> = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7_days", label: "Last 7 days" },
  { value: "last_30_days", label: "Last 30 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "this_quarter", label: "This quarter" },
  { value: "this_year", label: "This year" },
  { value: "custom", label: "Custom range" },
];

export type ResolvedExecRange = {
  from: Date;
  to: Date;
  label: string;
  previousFrom: Date;
  previousTo: Date;
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

export function resolveExecDateRange(input: {
  key: ExecDateRangeKey;
  now?: Date;
  customFrom?: string | null;
  customTo?: string | null;
}): ResolvedExecRange {
  const now = input.now ?? new Date();
  let to = endOfDay(now);
  let from = startOfDay(now);
  const label =
    EXEC_DATE_RANGE_OPTIONS.find((o) => o.value === input.key)?.label ??
    input.key;

  switch (input.key) {
    case "today":
      break;
    case "yesterday": {
      from.setDate(from.getDate() - 1);
      to = endOfDay(from);
      break;
    }
    case "last_7_days":
      from.setDate(from.getDate() - 6);
      break;
    case "last_30_days":
      from.setDate(from.getDate() - 29);
      break;
    case "this_month":
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "last_month": {
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      to = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
      break;
    }
    case "this_quarter": {
      const q = Math.floor(now.getMonth() / 3) * 3;
      from = new Date(now.getFullYear(), q, 1);
      break;
    }
    case "this_year":
      from = new Date(now.getFullYear(), 0, 1);
      break;
    case "custom": {
      if (input.customFrom) from = startOfDay(new Date(input.customFrom));
      if (input.customTo) to = endOfDay(new Date(input.customTo));
      break;
    }
  }

  const duration = Math.max(1, to.getTime() - from.getTime());
  const previousTo = new Date(from.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - duration);

  return { from, to, label, previousFrom, previousTo };
}

export function inDateRange(
  iso: string | null | undefined,
  from: Date,
  to: Date,
): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= from.getTime() && t <= to.getTime();
}
