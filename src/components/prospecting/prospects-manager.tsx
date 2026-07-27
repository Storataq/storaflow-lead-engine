"use client";

import { useMemo, useState } from "react";

import { ProspectBulkBar } from "@/components/prospecting/prospect-bulk-bar";
import { ProspectRowActions } from "@/components/prospecting/prospect-row-actions";
import { Badge } from "@/components/ui/badge";
import {
  LEAD_QUALITY_LABELS,
  PROSPECT_RECOMMENDATION_LABELS,
  PROSPECT_STATUS_LABELS,
  type LeadQuality,
  type ProspectRecommendation,
  type ProspectStatus,
} from "@/lib/prospecting/constants";
import type { ProspectingProspectRow } from "@/lib/prospecting/types";

export function ProspectsManager({
  prospects,
}: {
  prospects: ProspectingProspectRow[];
}) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([id]) => id),
    [selected],
  );

  return (
    <div className="space-y-4">
      <ProspectBulkBar selectedIds={selectedIds} />
      <div className="space-y-2">
        {prospects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No prospects yet.</p>
        ) : (
          prospects.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-md border px-3 py-3 text-sm"
            >
              <div className="flex min-w-0 gap-3">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={Boolean(selected[p.id])}
                  onChange={(e) =>
                    setSelected((prev) => ({
                      ...prev,
                      [p.id]: e.target.checked,
                    }))
                  }
                />
                <div className="min-w-0">
                  <p className="font-medium">{p.company_name}</p>
                  <p className="text-muted-foreground">
                    {p.website_url ?? "—"} · {p.city ?? "—"}, {p.country ?? "—"}
                  </p>
                  <p className="mt-1 line-clamp-2 text-muted-foreground">
                    {p.research_summary ?? p.description ?? "Not researched yet."}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge variant="outline">Score {p.lead_score}</Badge>
                    <Badge variant="secondary">
                      {LEAD_QUALITY_LABELS[p.lead_quality as LeadQuality] ??
                        p.lead_quality}
                    </Badge>
                    <Badge variant="outline">
                      {PROSPECT_RECOMMENDATION_LABELS[
                        p.recommendation as ProspectRecommendation
                      ] ?? p.recommendation}
                    </Badge>
                    <Badge variant="outline">
                      {PROSPECT_STATUS_LABELS[p.status as ProspectStatus] ??
                        p.status}
                    </Badge>
                    {p.is_duplicate ? (
                      <Badge variant="secondary">Duplicate</Badge>
                    ) : null}
                  </div>
                </div>
              </div>
              <ProspectRowActions prospectId={p.id} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
