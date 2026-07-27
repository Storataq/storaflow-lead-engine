"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { AiScoreCard } from "@/components/companies/intelligence-cards";
import { LeadScoreBadge } from "@/components/crm/lead-score-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BUYING_READINESS_LABELS,
  OPPORTUNITY_BAND_LABELS,
  SCORING_CATEGORY_LABELS,
  SUB_SCORE_LABELS,
  type BuyingReadiness,
  type OpportunityBand,
  type ScoringCategory,
  type SubScoreKey,
} from "@/lib/crm/lead-scoring/constants";
import { recalculateLeadScoreAction } from "@/lib/crm/lead-scoring/actions";
import type { LeadScoringHistoryRow } from "@/lib/crm/lead-scoring/queries";
import type { LeadScoringProfileRow } from "@/lib/crm/lead-scoring/queries";

type LeadScoringPanelProps = {
  leadId: string;
  profile: LeadScoringProfileRow | null;
  history: LeadScoringHistoryRow[];
  fallbackScore?: number | null;
};

export function LeadScoringPanel({
  leadId,
  profile,
  history,
  fallbackScore,
}: LeadScoringPanelProps) {
  const [pending, startTransition] = useTransition();

  const subScores =
    profile?.sub_scores_json &&
    typeof profile.sub_scores_json === "object" &&
    !Array.isArray(profile.sub_scores_json)
      ? (profile.sub_scores_json as Record<string, number>)
      : {};

  const explanations = Array.isArray(profile?.explanations_json)
    ? (profile!.explanations_json as Array<{
        code: string;
        label: string;
        sentiment: string;
      }>)
    : [];

  const risks = Array.isArray(profile?.risks_json)
    ? (profile!.risks_json as Array<{
        code: string;
        label: string;
        severity: string;
      }>)
    : [];

  const nbas = Array.isArray(profile?.next_best_actions_json)
    ? (profile!.next_best_actions_json as Array<{
        id: string;
        action: string;
        priority: string;
        rationale: string;
      }>)
    : [];

  const categories = Array.isArray(profile?.category_scores_json)
    ? (profile!.category_scores_json as Array<{
        category: string;
        score: number;
        weight: number;
        rationale: string;
      }>)
    : [];

  function refresh() {
    startTransition(async () => {
      const result = await recalculateLeadScoreAction(leadId);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
    });
  }

  const overall = profile?.overall_score ?? fallbackScore ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-medium">AI Lead Score</h2>
          <LeadScoreBadge
            score={overall}
            classification={profile?.classification}
            size="md"
          />
        </div>
        <Button type="button" size="sm" onClick={refresh} disabled={pending}>
          {pending ? "Scoring…" : "Recalculate score"}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AiScoreCard
          title="Overall"
          score={overall == null ? null : Number(overall)}
          badge={profile?.classification ?? undefined}
          subtitle={
            profile?.scored_at
              ? `Updated ${new Date(profile.scored_at).toLocaleString()}`
              : "Not scored yet"
          }
        />
        <AiScoreCard
          title="Opportunity"
          score={
            profile?.opportunity_confidence == null
              ? null
              : Number(profile.opportunity_confidence)
          }
          badge={
            profile?.opportunity_band
              ? OPPORTUNITY_BAND_LABELS[
                  profile.opportunity_band as OpportunityBand
                ] ?? profile.opportunity_band
              : undefined
          }
        />
        <AiScoreCard
          title="Risk"
          score={profile?.risk_score == null ? null : Number(profile.risk_score)}
          subtitle="Higher = more risk factors"
        />
        <AiScoreCard
          title="Confidence"
          score={profile?.confidence == null ? null : Number(profile.confidence)}
          badge={
            profile?.buying_readiness
              ? BUYING_READINESS_LABELS[
                  profile.buying_readiness as BuyingReadiness
                ] ?? profile.buying_readiness
              : undefined
          }
          subtitle="Buying readiness"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(SUB_SCORE_LABELS) as SubScoreKey[]).map((key) => (
          <AiScoreCard
            key={key}
            title={SUB_SCORE_LABELS[key]}
            score={
              typeof subScores[key] === "number" ? subScores[key]! : null
            }
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Why this score</CardTitle>
            <CardDescription>Explainable AI factors</CardDescription>
          </CardHeader>
          <CardContent>
            {explanations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Recalculate to generate explanations.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {explanations.map((e) => (
                  <li key={`${e.code}-${e.label}`} className="flex gap-2">
                    <Badge
                      variant="outline"
                      className={
                        e.sentiment === "positive"
                          ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                          : e.sentiment === "negative"
                            ? "border-rose-500/30 text-rose-700 dark:text-rose-300"
                            : undefined
                      }
                    >
                      {e.sentiment}
                    </Badge>
                    <span>{e.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Next best actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {nbas.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recommendations yet.</p>
            ) : (
              nbas.map((a) => (
                <div key={a.id} className="rounded-lg border p-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{a.action}</span>
                    <Badge variant="secondary">{a.priority}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{a.rationale}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {risks.length > 0 ? (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Risk factors</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {risks.map((r) => (
              <Badge key={r.code} variant="outline">
                {r.label} · {r.severity}
              </Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {categories.length > 0 ? (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Category breakdown</CardTitle>
            <CardDescription>Weighted scoring categories</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2">
              {categories.map((c) => (
                <li
                  key={c.category}
                  className="flex items-start justify-between gap-2 rounded-lg border p-2 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {SCORING_CATEGORY_LABELS[c.category as ScoringCategory] ??
                        c.category}
                    </p>
                    <p className="text-xs text-muted-foreground">{c.rationale}</p>
                  </div>
                  <Badge variant="secondary" className="tabular-nums">
                    {Math.round(c.score)} · w{c.weight}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Score history</CardTitle>
          <CardDescription>Old → new score timeline</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No history yet.</p>
          ) : (
            <ol className="space-y-2">
              {history.map((h) => (
                <li
                  key={h.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {h.old_score == null ? "—" : Math.round(Number(h.old_score))}{" "}
                      → {Math.round(Number(h.new_score))}
                      {h.delta != null ? (
                        <span className="ml-2 text-muted-foreground">
                          ({Number(h.delta) > 0 ? "+" : ""}
                          {Number(h.delta)})
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {h.reason}
                      {h.new_classification ? ` · ${h.new_classification}` : ""}
                    </p>
                  </div>
                  <time className="text-xs text-muted-foreground">
                    {new Date(h.created_at).toLocaleString()}
                  </time>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
