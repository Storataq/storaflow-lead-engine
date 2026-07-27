/**
 * Phase 25G — Executive Analytics pure calculations (unit-testable).
 */

export type MoneyRow = { value: number; currency: string };

export type CurrencyBucket = {
  currency: string;
  total: number;
  count: number;
};

export type TrendResult = {
  percentage: number | null;
  direction: "up" | "down" | "flat" | "unavailable";
  previousValue: number | null;
  label: string;
};

export type FunnelStepInput = {
  id: string;
  label: string;
  count: number;
};

export type FunnelStepMetric = FunnelStepInput & {
  conversionFromPrevious: number | null;
  dropOffCount: number;
  dropOffPercent: number | null;
  percentOfFirst: number | null;
};

/** Group monetary values by currency — never invent FX rates. */
export function groupByCurrency(rows: MoneyRow[]): CurrencyBucket[] {
  const map = new Map<string, { total: number; count: number }>();
  for (const row of rows) {
    const currency = (row.currency || "EUR").toUpperCase();
    const prev = map.get(currency) ?? { total: 0, count: 0 };
    prev.total += Number(row.value) || 0;
    prev.count += 1;
    map.set(currency, prev);
  }
  return [...map.entries()]
    .map(([currency, v]) => ({
      currency,
      total: Math.round(v.total * 100) / 100,
      count: v.count,
    }))
    .sort((a, b) => b.total - a.total);
}

/** Safe period comparison — no misleading % when previous is missing/zero. */
export function comparePeriods(
  current: number,
  previous: number | null | undefined,
): TrendResult {
  if (previous == null || Number.isNaN(previous)) {
    return {
      percentage: null,
      direction: "unavailable",
      previousValue: null,
      label: "No comparison data",
    };
  }
  if (previous === 0 && current === 0) {
    return {
      percentage: 0,
      direction: "flat",
      previousValue: 0,
      label: "vs previous period",
    };
  }
  if (previous === 0) {
    return {
      percentage: null,
      direction: "unavailable",
      previousValue: 0,
      label: "Previous period was zero",
    };
  }
  const delta = ((current - previous) / Math.abs(previous)) * 100;
  const percentage = Math.round(Math.abs(delta) * 10) / 10;
  const direction: TrendResult["direction"] =
    delta > 0.05 ? "up" : delta < -0.05 ? "down" : "flat";
  return {
    percentage,
    direction,
    previousValue: previous,
    label: "vs previous period",
  };
}

export function buildFunnelMetrics(
  steps: FunnelStepInput[],
): FunnelStepMetric[] {
  const first = steps[0]?.count ?? 0;
  return steps.map((step, index) => {
    const prev = index > 0 ? steps[index - 1]!.count : null;
    const conversionFromPrevious =
      prev == null || prev <= 0
        ? null
        : Math.round((step.count / prev) * 1000) / 10;
    const dropOffCount = prev == null ? 0 : Math.max(0, prev - step.count);
    const dropOffPercent =
      prev == null || prev <= 0
        ? null
        : Math.round((dropOffCount / prev) * 1000) / 10;
    const percentOfFirst =
      first <= 0 ? null : Math.round((step.count / first) * 1000) / 10;
    return {
      ...step,
      conversionFromPrevious,
      dropOffCount,
      dropOffPercent,
      percentOfFirst,
    };
  });
}

export function overallFunnelConversion(steps: FunnelStepInput[]): number | null {
  if (steps.length < 2) return null;
  const first = steps[0]!.count;
  const last = steps[steps.length - 1]!.count;
  if (first <= 0) return null;
  return Math.round((last / first) * 1000) / 10;
}

export function distributionCounts(
  values: Array<string | null | undefined>,
  unknownLabel = "Unknown",
): Array<{ key: string; label: string; count: number }> {
  const map = new Map<string, number>();
  for (const raw of values) {
    const key = (raw && String(raw).trim()) || unknownLabel;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([key, count]) => ({ key, label: key, count }))
    .sort((a, b) => b.count - a.count);
}

export function average(numbers: number[]): number | null {
  if (numbers.length === 0) return null;
  const sum = numbers.reduce((a, b) => a + b, 0);
  return Math.round((sum / numbers.length) * 10) / 10;
}
