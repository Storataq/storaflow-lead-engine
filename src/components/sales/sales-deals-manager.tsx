"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  bulkAnalyzeDealsAction,
  bulkCreateFollowUpsAction,
} from "@/lib/sales-agent/actions";
import { SalesDealActions } from "@/components/sales/sales-action-buttons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  NEXT_BEST_ACTION_LABELS,
  RISK_LEVEL_LABELS,
  type NextBestAction,
  type RiskLevel,
} from "@/lib/sales-agent/constants";
import type { SalesDealInsightRow } from "@/lib/sales-agent/types";

type DealRow = {
  id: string;
  title: string;
  value: number;
  probability: number | null;
  expected_close_date: string | null;
  lead_ai_score: number | null;
};

export function SalesDealsManager({
  deals,
  insights,
}: {
  deals: DealRow[];
  insights: SalesDealInsightRow[];
}) {
  const insightByDeal = useMemo(
    () => new Map(insights.map((i) => [i.deal_id, i])),
    [insights],
  );
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([id]) => id),
    [selected],
  );
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={pending || selectedIds.length === 0}
          onClick={() =>
            startTransition(async () => {
              const r = await bulkAnalyzeDealsAction(selectedIds);
              if (r.success) toast.success(r.message);
              else toast.error(r.message);
            })
          }
        >
          Bulk AI analysis ({selectedIds.length})
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending || selectedIds.length === 0}
          onClick={() =>
            startTransition(async () => {
              const r = await bulkCreateFollowUpsAction(selectedIds);
              if (r.success) toast.success(r.message);
              else toast.error(r.message);
            })
          }
        >
          Bulk follow-up
        </Button>
      </div>

      <div className="space-y-2">
        {deals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open deals.</p>
        ) : (
          deals.map((deal) => {
            const insight = insightByDeal.get(deal.id);
            return (
              <div
                key={deal.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-md border px-3 py-3 text-sm"
              >
                <div className="flex min-w-0 gap-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={Boolean(selected[deal.id])}
                    onChange={(e) =>
                      setSelected((prev) => ({
                        ...prev,
                        [deal.id]: e.target.checked,
                      }))
                    }
                  />
                  <div className="min-w-0">
                    <p className="font-medium">{deal.title}</p>
                    <p className="text-muted-foreground">
                      €{Number(deal.value).toLocaleString("nl-NL")} · close{" "}
                      {deal.expected_close_date ?? "—"} · lead score{" "}
                      {deal.lead_ai_score ?? "—"}
                    </p>
                    {insight ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        <Badge variant="outline">
                          Priority {insight.priority_score}
                        </Badge>
                        <Badge variant="secondary">
                          {RISK_LEVEL_LABELS[insight.risk_level as RiskLevel] ??
                            insight.risk_level}
                        </Badge>
                        <Badge variant="outline">
                          {NEXT_BEST_ACTION_LABELS[
                            insight.next_best_action as NextBestAction
                          ] ?? insight.next_best_action}
                        </Badge>
                        <Badge variant="outline">
                          Win {Math.round(Number(insight.closing_probability) * 100)}%
                        </Badge>
                      </div>
                    ) : (
                      <p className="mt-1 text-muted-foreground">
                        Not analyzed yet — run Analyze.
                      </p>
                    )}
                  </div>
                </div>
                <SalesDealActions dealId={deal.id} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
