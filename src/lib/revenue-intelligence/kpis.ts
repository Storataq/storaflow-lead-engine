/**
 * KPI engine — MRR, ARR, LTV, CAC, NRR, GRR, etc.
 */

import type {
  RevenueBillingSignal,
  RevenueDealSignal,
  RevenueInvoiceSignal,
  RevenueKpiBundle,
} from "@/lib/revenue-intelligence/types";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export function computeRevenueKpis(input: {
  deals: RevenueDealSignal[];
  invoices: RevenueInvoiceSignal[];
  billing: RevenueBillingSignal | null;
  customerCount: number;
  previousMrr?: number;
  marketingSpendHint?: number;
}): RevenueKpiBundle {
  const won = input.deals.filter((d) => d.status === "won");
  const open = input.deals.filter((d) => d.status === "open");
  const lost = input.deals.filter((d) => d.status === "lost");

  const wonRevenue = won.reduce((s, d) => s + d.value, 0);
  const openRevenue = open.reduce((s, d) => s + d.value, 0);

  const paidInvoices = input.invoices.filter(
    (i) => i.status === "paid" || i.paidAt,
  );
  const invoiceRevenue =
    paidInvoices.reduce((s, i) => s + i.amountDueCents, 0) / 100;

  const grossRevenue = Math.max(wonRevenue, invoiceRevenue);
  const seatPriceHint =
    input.billing?.amountHint && input.billing.seatsPurchased > 0
      ? input.billing.amountHint
      : Math.max(49, wonRevenue / Math.max(1, input.customerCount) / 12);

  const mrrFromBilling =
    input.billing &&
    (input.billing.status === "active" || input.billing.status === "trialing")
      ? input.billing.interval === "year"
        ? (input.billing.amountHint || seatPriceHint * input.billing.seatsPurchased) /
          12
        : input.billing.amountHint ||
          seatPriceHint * Math.max(1, input.billing.seatsPurchased)
      : 0;

  const mrrFromDeals = wonRevenue / 12;
  const mrr = round2(Math.max(mrrFromBilling, mrrFromDeals * 0.35, mrrFromDeals > 0 ? mrrFromDeals * 0.2 : 0));
  const arr = round2(mrr * 12);

  const avgDealValue =
    won.length === 0 ? 0 : round2(wonRevenue / won.length);
  const acv = avgDealValue > 0 ? avgDealValue : round2(arr / Math.max(1, input.customerCount));
  const arpa =
    input.customerCount === 0 ? 0 : round2(mrr / Math.max(1, input.customerCount));

  const churnHint =
    lost.length + won.length === 0
      ? 0.05
      : lost.length / Math.max(1, lost.length + won.length);
  const ltv = round2(arpa > 0 ? arpa / Math.max(0.02, churnHint) : acv * 2.5);

  const cac = round2(
    Math.max(
      50,
      (input.marketingSpendHint ?? Math.max(200, won.length * 120)) /
        Math.max(1, won.length || input.customerCount || 1),
    ),
  );
  const ltvCac = cac === 0 ? 0 : round2(ltv / cac);

  const expansionRevenue = round2(
    open
      .filter((d) => /upsell|expansion|upgrade|cross/i.test(d.title))
      .reduce((s, d) => s + d.value * ((d.probability ?? 40) / 100), 0),
  );
  const contractionRevenue = round2(lost.reduce((s, d) => s + d.value * 0.15, 0));
  const netRevenue = round2(
    Math.max(0, grossRevenue + expansionRevenue - contractionRevenue),
  );

  const retentionRate = clamp01(1 - churnHint);
  const grr = clamp01(retentionRate);
  const nrr = clamp01(
    retentionRate +
      (grossRevenue > 0 ? expansionRevenue / Math.max(1, grossRevenue) : 0) -
      (grossRevenue > 0 ? contractionRevenue / Math.max(1, grossRevenue) : 0),
  );

  const marginRate = clamp01(0.55 + (ltvCac > 3 ? 0.1 : 0) - churnHint * 0.2);
  const profit = round2(netRevenue * marginRate);
  const avgOrderValue = avgDealValue;

  const previousMrr = input.previousMrr ?? mrr * 0.92;
  const growthRate =
    previousMrr <= 0 ? 0 : round2((mrr - previousMrr) / previousMrr);

  const confidence = clamp01(
    0.35 +
      (won.length > 0 ? 0.15 : 0) +
      (input.invoices.length > 0 ? 0.15 : 0) +
      (input.billing ? 0.2 : 0) +
      (input.customerCount > 0 ? 0.1 : 0),
  );

  void openRevenue;

  return {
    mrr,
    arr,
    acv: round2(acv),
    arpa,
    ltv,
    cac,
    ltvCac,
    grossRevenue: round2(grossRevenue),
    netRevenue,
    expansionRevenue,
    contractionRevenue,
    retentionRate: round2(retentionRate),
    nrr: round2(nrr),
    grr: round2(grr),
    marginRate: round2(marginRate),
    profit,
    avgDealValue,
    avgOrderValue,
    growthRate,
    customerCount: input.customerCount,
    confidence: round2(confidence),
  };
}
