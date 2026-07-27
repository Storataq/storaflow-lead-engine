"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { ContactBadgeList } from "@/components/crm/contact-badges";
import {
  ContactHealthScoreCard,
  ContactIntelSectionCard,
  ContactQualityScoreCard,
  InfluenceMeter,
  KeyValueRows,
} from "@/components/crm/contact-intelligence-cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { refreshContactIntelligenceAction } from "@/lib/crm/contact-intelligence/actions";
import {
  HEALTH_BAND_LABELS,
  type HealthBand,
} from "@/lib/crm/contact-intelligence/constants";
import type {
  CommunicationPreferencesBlock,
  ContactAiSummary,
  ContactBadgeItem,
  ContactHealthBlock,
  ContactIntelligenceProfileRow,
  ContactProfileBlock,
  ContactQualityBlock,
  DecisionMakerBlock,
  InsightItem,
  RecommendationItem,
  TimelineItem,
} from "@/lib/crm/contact-intelligence/types";

type Props = {
  contactId: string;
  profile: ContactIntelligenceProfileRow | null;
  canManage: boolean;
  statusHint?: string | null;
  badgesHint?: unknown;
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function statusLabel(status: string | null | undefined): string {
  switch (status) {
    case "processing":
      return "Processing";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    case "idle":
      return "Idle";
    default:
      return status ?? "Not analyzed";
  }
}

export function ContactIntelligencePanel({
  contactId,
  profile,
  canManage,
  statusHint,
  badgesHint,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const summary = profile
    ? (asRecord(profile.summary_json) as Partial<ContactAiSummary>)
    : null;
  const contactProfile = profile
    ? (asRecord(profile.profile_json) as Partial<ContactProfileBlock>)
    : null;
  const decision = profile
    ? (asRecord(profile.decision_maker_json) as Partial<DecisionMakerBlock>)
    : null;
  const communication = profile
    ? (asRecord(profile.communication_json) as Partial<CommunicationPreferencesBlock>)
    : null;
  const health = profile
    ? (asRecord(profile.health_json) as Partial<ContactHealthBlock>)
    : null;
  const quality = profile
    ? (asRecord(profile.quality_json) as Partial<ContactQualityBlock>)
    : null;
  const timeline = profile ? asArray<TimelineItem>(profile.timeline_json) : [];
  const insights = profile ? asArray<InsightItem>(profile.insights_json) : [];
  const recommendations = profile
    ? asArray<RecommendationItem>(profile.recommendations_json)
    : [];
  const badges = profile
    ? asArray<ContactBadgeItem>(profile.badges_json)
    : asArray<ContactBadgeItem>(badgesHint);

  const healthScore =
    profile?.health_score != null
      ? Number(profile.health_score)
      : health?.score ?? null;
  const qualityScore =
    profile?.quality_score != null
      ? Number(profile.quality_score)
      : quality?.score ?? null;
  const band = (health?.band as HealthBand | undefined) ?? null;
  const status = profile?.status ?? statusHint ?? null;

  function onRefresh() {
    startTransition(async () => {
      const result = await refreshContactIntelligenceAction(contactId);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <section
      id="contact-intelligence"
      aria-labelledby="contact-intelligence-heading"
      className="space-y-4"
    >
      <Card className="shadow-none">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle id="contact-intelligence-heading" className="text-base">
              Contact Intelligence
            </CardTitle>
            <CardDescription>
              AI contact profile for scoring, outreach, and campaign
              personalization.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{statusLabel(status)}</Badge>
            {profile?.needs_review ? (
              <Badge variant="secondary">Needs review</Badge>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canManage || pending || status === "processing"}
              onClick={onRefresh}
              aria-busy={pending}
            >
              {pending || status === "processing"
                ? "Analyzing…"
                : "Refresh AI Analysis"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground">Last analyzed</p>
              <p className="font-medium">{formatDate(profile?.analyzed_at)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Confidence</p>
              <p className="font-medium">
                {profile?.confidence != null
                  ? `${Math.round(Number(profile.confidence))}%`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Provider</p>
              <p className="font-medium">
                {profile?.provider
                  ? `${profile.provider}${profile.model ? ` / ${profile.model}` : ""}`
                  : profile
                    ? "Deterministic"
                    : "—"}
              </p>
            </div>
          </div>
          {badges.length ? <ContactBadgeList badges={badges} /> : null}
        </CardContent>
      </Card>

      {!profile ? (
        <Card className="shadow-none">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No AI analysis yet. Run{" "}
            <span className="font-medium text-foreground">
              Refresh AI Analysis
            </span>{" "}
            to build an intelligent contact profile.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <ContactHealthScoreCard score={healthScore} band={band} />
            <ContactQualityScoreCard score={qualityScore} />
          </div>

          {summary && Object.keys(summary).length ? (
            <ContactIntelSectionCard
              title="AI Summary"
              description={
                summary.confidence != null
                  ? `Confidence ${Math.round(Number(summary.confidence))}%`
                  : undefined
              }
            >
              <KeyValueRows
                rows={[
                  { label: "Who", value: summary.who || "—" },
                  { label: "Current role", value: summary.currentRole || "—" },
                  {
                    label: "Responsibilities",
                    value: summary.responsibilities || "—",
                  },
                  {
                    label: "Decision influence",
                    value: summary.decisionMakingInfluence || "—",
                  },
                  {
                    label: "Communication style",
                    value: summary.communicationStyle || "—",
                  },
                  {
                    label: "Potential value",
                    value: summary.potentialValue || "—",
                  },
                ]}
              />
              {Array.isArray(summary.possibleInterests) &&
              summary.possibleInterests.length ? (
                <div>
                  <p className="mb-1 font-medium">Possible interests</p>
                  <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                    {summary.possibleInterests.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </ContactIntelSectionCard>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            {contactProfile ? (
              <ContactIntelSectionCard title="Contact Profile">
                <KeyValueRows
                  rows={[
                    {
                      label: "Job title",
                      value: contactProfile.jobTitle ?? "—",
                    },
                    {
                      label: "Department",
                      value: contactProfile.department ?? "—",
                    },
                    {
                      label: "Management level",
                      value: contactProfile.managementLevel ?? "—",
                    },
                    {
                      label: "Decision maker level",
                      value: contactProfile.decisionMakerLevel ?? "—",
                    },
                    {
                      label: "Technical role",
                      value: contactProfile.technicalRole ? "Yes" : "No",
                    },
                    {
                      label: "Commercial role",
                      value: contactProfile.commercialRole ? "Yes" : "No",
                    },
                    {
                      label: "Finance role",
                      value: contactProfile.financeRole ? "Yes" : "No",
                    },
                    {
                      label: "Operations role",
                      value: contactProfile.operationsRole ? "Yes" : "No",
                    },
                    {
                      label: "Seniority",
                      value: contactProfile.estimatedSeniority ?? "—",
                    },
                    {
                      label: "Language",
                      value: contactProfile.primaryLanguage ?? "—",
                    },
                    {
                      label: "Country",
                      value: contactProfile.country ?? "—",
                    },
                    {
                      label: "Region",
                      value: contactProfile.region ?? "—",
                    },
                    {
                      label: "Timezone",
                      value: contactProfile.timezone ?? "—",
                    },
                  ]}
                />
              </ContactIntelSectionCard>
            ) : null}

            {decision ? (
              <ContactIntelSectionCard
                title="Decision Maker Analysis"
                description={decision.summary}
              >
                <div className="mb-2">
                  <Badge variant={decision.isDecisionMaker ? "default" : "outline"}>
                    {decision.isDecisionMaker
                      ? "Decision maker"
                      : "Not flagged as decision maker"}
                  </Badge>
                </div>
                <div className="space-y-3">
                  <InfluenceMeter
                    label="Buying influence"
                    value={Number(decision.buyingInfluence ?? 0)}
                  />
                  <InfluenceMeter
                    label="Decision authority"
                    value={Number(decision.decisionAuthority ?? 0)}
                  />
                  <InfluenceMeter
                    label="Budget influence"
                    value={Number(decision.budgetInfluence ?? 0)}
                  />
                  <InfluenceMeter
                    label="Technical influence"
                    value={Number(decision.technicalInfluence ?? 0)}
                  />
                  <InfluenceMeter
                    label="Executive influence"
                    value={Number(decision.executiveInfluence ?? 0)}
                  />
                </div>
              </ContactIntelSectionCard>
            ) : null}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {communication ? (
              <ContactIntelSectionCard title="Communication Preferences">
                <KeyValueRows
                  rows={[
                    {
                      label: "Preferred channel",
                      value: communication.preferredChannel ?? "unknown",
                    },
                    {
                      label: "Frequency",
                      value: communication.frequency ?? "—",
                    },
                    {
                      label: "Best timing",
                      value: communication.bestTiming ?? "—",
                    },
                    {
                      label: "Rationale",
                      value: communication.rationale ?? "—",
                    },
                  ]}
                />
              </ContactIntelSectionCard>
            ) : null}

            <ContactIntelSectionCard title="AI Insights">
              {insights.length === 0 ? (
                <p className="text-muted-foreground">No insights yet.</p>
              ) : (
                <ul className="space-y-2">
                  {insights.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                    >
                      <span>{item.label}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{item.severity}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(item.confidence)}%
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </ContactIntelSectionCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ContactIntelSectionCard title="AI Recommendations">
              {recommendations.length === 0 ? (
                <p className="text-muted-foreground">No recommendations yet.</p>
              ) : (
                <ul className="space-y-2">
                  {recommendations.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-lg border border-border px-3 py-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">{item.action}</p>
                        <Badge variant="secondary">{item.priority}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.rationale}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </ContactIntelSectionCard>

            <ContactIntelSectionCard
              title="Contact Quality breakdown"
              description={
                band ? `Health: ${HEALTH_BAND_LABELS[band]}` : undefined
              }
            >
              {Array.isArray(quality?.explanations) &&
              quality.explanations.length ? (
                <ul className="space-y-2">
                  {quality.explanations.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-lg border border-border px-3 py-2"
                    >
                      <div className="flex justify-between gap-2">
                        <p className="font-medium">{item.label}</p>
                        <span className="tabular-nums text-muted-foreground">
                          +{item.points}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.detail}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">No quality breakdown.</p>
              )}
            </ContactIntelSectionCard>
          </div>

          <ContactIntelSectionCard title="Relationship Timeline">
            {timeline.length === 0 ? (
              <p className="text-muted-foreground">No timeline events yet.</p>
            ) : (
              <ol className="relative space-y-3 border-l border-border pl-4">
                {timeline.map((item) => (
                  <li key={item.id} className="relative">
                    <span
                      className="absolute -left-[1.28rem] top-1.5 size-2 rounded-full bg-foreground/70"
                      aria-hidden
                    />
                    <p className="font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(item.at)}
                      {item.detail ? ` · ${item.detail}` : ""}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </ContactIntelSectionCard>
        </>
      )}
    </section>
  );
}
