"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  bulkAnalyzeCustomersAction,
  bulkCreateSuccessPlansAction,
} from "@/lib/customer-success/actions";
import { CsAnalyzeButton, CsRenewalTasksButton } from "@/components/customer-success/cs-action-buttons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  HEALTH_CLASS_LABELS,
  type HealthClass,
} from "@/lib/customer-success/constants";
import type { CsProfileRow } from "@/lib/customer-success/types";

type CompanyRow = {
  id: string;
  company_name: string;
  industry: string | null;
  country: string | null;
};

export function CsCustomersManager({
  companies,
  profiles,
}: {
  companies: CompanyRow[];
  profiles: CsProfileRow[];
}) {
  const byCompany = useMemo(
    () => new Map(profiles.map((p) => [p.company_id, p])),
    [profiles],
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
              const r = await bulkAnalyzeCustomersAction(selectedIds);
              if (r.success) toast.success(r.message);
              else toast.error(r.message);
            })
          }
        >
          Bulk analyse ({selectedIds.length})
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending || selectedIds.length === 0}
          onClick={() =>
            startTransition(async () => {
              const r = await bulkCreateSuccessPlansAction(selectedIds);
              if (r.success) toast.success(r.message);
              else toast.error(r.message);
            })
          }
        >
          Bulk success plans
        </Button>
      </div>

      <div className="space-y-2">
        {companies.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Geen companies met status customer. Analyse valt terug op won deals.
          </p>
        ) : (
          companies.map((c) => {
            const profile = byCompany.get(c.id);
            return (
              <div
                key={c.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-md border px-3 py-3 text-sm"
              >
                <div className="flex min-w-0 gap-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={Boolean(selected[c.id])}
                    onChange={(e) =>
                      setSelected((prev) => ({
                        ...prev,
                        [c.id]: e.target.checked,
                      }))
                    }
                  />
                  <div className="min-w-0">
                    <p className="font-medium">{c.company_name}</p>
                    <p className="text-muted-foreground">
                      {c.industry ?? "—"} · {c.country ?? "—"}
                    </p>
                    {profile ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        <Badge variant="outline">Health {profile.health_score}</Badge>
                        <Badge variant="secondary">
                          {HEALTH_CLASS_LABELS[profile.health_class as HealthClass] ??
                            profile.health_class}
                        </Badge>
                        <Badge variant="outline">
                          Churn {Math.round(Number(profile.churn_probability) * 100)}%
                        </Badge>
                      </div>
                    ) : (
                      <p className="mt-1 text-muted-foreground">Nog niet geanalyseerd.</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <CsAnalyzeButton companyIds={[c.id]} />
                  <CsRenewalTasksButton companyId={c.id} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
