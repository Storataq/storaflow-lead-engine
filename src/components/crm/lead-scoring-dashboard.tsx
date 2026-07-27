"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { LeadScoreBadge } from "@/components/crm/lead-score-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BUYING_READINESS_LABELS,
  LEAD_CLASSIFICATIONS,
  LEAD_CLASSIFICATION_LABELS,
  OPPORTUNITY_BANDS,
  OPPORTUNITY_BAND_LABELS,
  BUYING_READINESS_VALUES,
} from "@/lib/crm/lead-scoring/constants";
import {
  acknowledgeScoringAlertAction,
  recalculateLeadScoresBatchAction,
} from "@/lib/crm/lead-scoring/actions";
import type { LeadScoringAlertRow } from "@/lib/crm/lead-scoring/queries";

type ScoredLead = {
  id: string;
  company_name: string;
  industry: string | null;
  country: string | null;
  owner_user_id: string | null;
  ai_lead_score: number | null;
  score_classification: string | null;
  opportunity_band: string | null;
  risk_score: number | null;
  buying_readiness: string | null;
  score_delta: number | null;
  scored_at: string | null;
};

type Leaderboards = {
  highest: ScoredLead[];
  fastestGrowing: ScoredLead[];
  biggestOpportunities: ScoredLead[];
  highestRisk: ScoredLead[];
  recentlyImproved: ScoredLead[];
  needsAttention: ScoredLead[];
  totals: { scored: number; hot: number; avgScore: number };
};

type LeadScoringDashboardProps = {
  leaderboards: Leaderboards;
  alerts: LeadScoringAlertRow[];
  leads: ScoredLead[];
};

function LeadList({
  title,
  description,
  rows,
}: {
  title: string;
  description?: string;
  rows: ScoredLead[];
}) {
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        ) : (
          rows.map((row) => (
            <Link
              key={row.id}
              href={`/crm/leads/${row.id}`}
              className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm hover:bg-muted/40"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{row.company_name}</p>
                <p className="text-xs text-muted-foreground">
                  {[row.industry, row.country].filter(Boolean).join(" · ") || "—"}
                  {row.score_delta != null && Number(row.score_delta) !== 0
                    ? ` · Δ ${Number(row.score_delta) > 0 ? "+" : ""}${Number(row.score_delta)}`
                    : ""}
                </p>
              </div>
              <LeadScoreBadge
                score={row.ai_lead_score}
                classification={row.score_classification}
              />
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function LeadScoringDashboard({
  leaderboards,
  alerts,
  leads,
}: LeadScoringDashboardProps) {
  const [query, setQuery] = useState("");
  const [classification, setClassification] = useState("all");
  const [opportunity, setOpportunity] = useState("all");
  const [readiness, setReadiness] = useState("all");
  const [minScore, setMinScore] = useState("");
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return leads.filter((row) => {
      if (
        classification !== "all" &&
        row.score_classification !== classification
      ) {
        return false;
      }
      if (opportunity !== "all" && row.opportunity_band !== opportunity) {
        return false;
      }
      if (readiness !== "all" && row.buying_readiness !== readiness) {
        return false;
      }
      if (minScore.trim()) {
        const min = Number(minScore);
        if (Number.isFinite(min) && Number(row.ai_lead_score ?? 0) < min) {
          return false;
        }
      }
      if (query.trim()) {
        const needle = query.trim().toLowerCase();
        const hay = [row.company_name, row.industry ?? "", row.country ?? ""]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [leads, query, classification, opportunity, readiness, minScore]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="shadow-none">
            <CardHeader className="pb-2">
              <CardDescription>Scored leads</CardDescription>
              <CardTitle className="text-base tabular-nums">
                {leaderboards.totals.scored}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="shadow-none">
            <CardHeader className="pb-2">
              <CardDescription>Hot / Very Hot</CardDescription>
              <CardTitle className="text-base tabular-nums">
                {leaderboards.totals.hot}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="shadow-none">
            <CardHeader className="pb-2">
              <CardDescription>Average score</CardDescription>
              <CardTitle className="text-base tabular-nums">
                {leaderboards.totals.avgScore}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            nativeButton={false}
            render={<Link href="/crm/scoring/settings" />}
          >
            Configure weights
          </Button>
          <Button
            type="button"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const result = await recalculateLeadScoresBatchAction(25);
                if (!result.success) {
                  toast.error(result.message);
                  return;
                }
                toast.success(result.message);
              });
            }}
          >
            {pending ? "Running…" : "Batch recalculate (25)"}
          </Button>
        </div>
      </div>

      {alerts.length > 0 ? (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Alerts</CardTitle>
            <CardDescription>
              Hot changes, score moves, opportunity/risk shifts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg border p-2 text-sm"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{alert.title}</span>
                    <Badge variant="outline">{alert.severity}</Badge>
                  </div>
                  <p className="text-muted-foreground">{alert.message}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      const result = await acknowledgeScoringAlertAction(
                        alert.id,
                      );
                      if (!result.success) toast.error(result.message);
                      else toast.success(result.message);
                    });
                  }}
                >
                  Ack
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <LeadList title="Highest scores" rows={leaderboards.highest} />
        <LeadList
          title="Fastest growing"
          description="Largest positive score delta"
          rows={leaderboards.fastestGrowing}
        />
        <LeadList
          title="Biggest opportunities"
          rows={leaderboards.biggestOpportunities}
        />
        <LeadList title="Highest risk" rows={leaderboards.highestRisk} />
        <LeadList
          title="Recently improved"
          rows={leaderboards.recentlyImproved}
        />
        <LeadList title="Needs attention" rows={leaderboards.needsAttention} />
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">All scored leads</CardTitle>
          <CardDescription>
            Filter by score, opportunity, readiness, industry/country signals
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search company…"
              aria-label="Search leads"
            />
            <select
              className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={classification}
              onChange={(e) => setClassification(e.target.value)}
              aria-label="Classification"
            >
              <option value="all">All classifications</option>
              {LEAD_CLASSIFICATIONS.map((c) => (
                <option key={c} value={c}>
                  {LEAD_CLASSIFICATION_LABELS[c]}
                </option>
              ))}
            </select>
            <select
              className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={opportunity}
              onChange={(e) => setOpportunity(e.target.value)}
              aria-label="Opportunity"
            >
              <option value="all">All opportunities</option>
              {OPPORTUNITY_BANDS.map((b) => (
                <option key={b} value={b}>
                  {OPPORTUNITY_BAND_LABELS[b]}
                </option>
              ))}
            </select>
            <select
              className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={readiness}
              onChange={(e) => setReadiness(e.target.value)}
              aria-label="Buying readiness"
            >
              <option value="all">All readiness</option>
              {BUYING_READINESS_VALUES.map((b) => (
                <option key={b} value={b}>
                  {BUYING_READINESS_LABELS[b]}
                </option>
              ))}
            </select>
            <Input
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              placeholder="Min score"
              inputMode="numeric"
              aria-label="Minimum lead score"
            />
          </div>

          <ul className="space-y-2">
            {filtered.slice(0, 50).map((row) => (
              <li key={row.id}>
                <Link
                  href={`/crm/leads/${row.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm hover:bg-muted/40"
                >
                  <div>
                    <p className="font-medium">{row.company_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.opportunity_band
                        ? OPPORTUNITY_BAND_LABELS[
                            row.opportunity_band as keyof typeof OPPORTUNITY_BAND_LABELS
                          ] ?? row.opportunity_band
                        : "—"}
                      {" · risk "}
                      {row.risk_score == null
                        ? "—"
                        : Math.round(Number(row.risk_score))}
                      {row.buying_readiness
                        ? ` · ${
                            BUYING_READINESS_LABELS[
                              row.buying_readiness as keyof typeof BUYING_READINESS_LABELS
                            ] ?? row.buying_readiness
                          }`
                        : ""}
                    </p>
                  </div>
                  <LeadScoreBadge
                    score={row.ai_lead_score}
                    classification={row.score_classification}
                  />
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
