"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  CompanyHealthCard,
  IntelligenceSectionCard,
  KeyValueRows,
  LeadPotentialCard,
} from "@/components/companies/intelligence-cards";
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
  HEALTH_BAND_LABELS,
  LEAD_TEMPERATURE_LABELS,
  type HealthBand,
  type LeadTemperature,
} from "@/lib/companies/intelligence/constants";
import { refreshCompanyIntelligenceAction } from "@/lib/companies/intelligence/actions";
import type {
  AiSummaryBlock,
  BusinessProfileBlock,
  CompanyIntelligenceProfileRow,
  ContactQualityBlock,
  GrowthSignalItem,
  HealthBlock,
  InsightItem,
  LeadPotentialBlock,
  OnlinePresenceBlock,
  RecommendationItem,
} from "@/lib/companies/intelligence/types";

type CompanyIntelligencePanelProps = {
  companyId: string;
  profile: CompanyIntelligenceProfileRow | null;
  canManage: boolean;
  companyStatusHint?: string | null;
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

function parseSummary(value: unknown): AiSummaryBlock | null {
  const row = asRecord(value);
  if (!Object.keys(row).length) return null;
  return {
    whatTheyDo: String(row.whatTheyDo ?? ""),
    targetAudience: String(row.targetAudience ?? ""),
    productsServices: String(row.productsServices ?? ""),
    businessModel: String(row.businessModel ?? ""),
    estimatedSize: String(row.estimatedSize ?? ""),
    marketPosition: String(row.marketPosition ?? ""),
    strengths: asArray<string>(row.strengths),
    weaknesses: asArray<string>(row.weaknesses),
    opportunities: asArray<string>(row.opportunities),
    confidence: Number(row.confidence ?? 0),
  };
}

function parseBusiness(value: unknown): BusinessProfileBlock | null {
  const row = asRecord(value);
  if (!Object.keys(row).length) return null;
  return {
    industry: (row.industry as string | null) ?? null,
    subIndustry: (row.subIndustry as string | null) ?? null,
    businessCategory: (row.businessCategory as string | null) ?? null,
    companyType: (row.companyType as string | null) ?? null,
    audience: (row.audience as BusinessProfileBlock["audience"]) ?? "unknown",
    estimatedEmployees: (row.estimatedEmployees as string | null) ?? null,
    estimatedRevenue: (row.estimatedRevenue as string | null) ?? null,
    foundedYear: (row.foundedYear as number | null) ?? null,
    country: (row.country as string | null) ?? null,
    region: (row.region as string | null) ?? null,
    languages: asArray<string>(row.languages),
  };
}

function parseOnline(value: unknown): OnlinePresenceBlock | null {
  const row = asRecord(value);
  if (!Object.keys(row).length) return null;
  const social = asRecord(row.social);
  return {
    websiteAvailable: Boolean(row.websiteAvailable),
    sslLikely: Boolean(row.sslLikely),
    mobileFriendlyUnknown: Boolean(row.mobileFriendlyUnknown ?? true),
    social: {
      facebook: Boolean(social.facebook),
      instagram: Boolean(social.instagram),
      linkedin: Boolean(social.linkedin),
      x: Boolean(social.x),
      youtube: Boolean(social.youtube),
      tiktok: Boolean(social.tiktok),
    },
    googleBusiness: Boolean(row.googleBusiness),
    reviewPlatforms: Boolean(row.reviewPlatforms),
    websiteQualityScore: Number(row.websiteQualityScore ?? 0),
  };
}

function yesNo(value: boolean): string {
  return value ? "Yes" : "No";
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

export function CompanyIntelligencePanel({
  companyId,
  profile,
  canManage,
  companyStatusHint,
}: CompanyIntelligencePanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const summary = profile ? parseSummary(profile.summary_json) : null;
  const business = profile ? parseBusiness(profile.business_profile_json) : null;
  const online = profile ? parseOnline(profile.online_presence_json) : null;
  const insights = profile ? asArray<InsightItem>(profile.insights_json) : [];
  const health = profile
    ? (asRecord(profile.health_json) as Partial<HealthBlock>)
    : null;
  const lead = profile
    ? (asRecord(profile.lead_potential_json) as Partial<LeadPotentialBlock>)
    : null;
  const contact = profile
    ? (asRecord(profile.contact_quality_json) as Partial<ContactQualityBlock>)
    : null;
  const growth = profile
    ? asArray<GrowthSignalItem>(profile.growth_signals_json)
    : [];
  const recommendations = profile
    ? asArray<RecommendationItem>(profile.recommendations_json)
    : [];

  const healthScore =
    profile?.health_score != null
      ? Number(profile.health_score)
      : health?.score ?? null;
  const leadScore =
    profile?.lead_potential_score != null
      ? Number(profile.lead_potential_score)
      : lead?.score ?? null;
  const band = (health?.band as HealthBand | undefined) ?? null;
  const temperature =
    (lead?.temperature as LeadTemperature | undefined) ?? null;
  const status = profile?.status ?? companyStatusHint ?? null;

  function onRefresh() {
    startTransition(async () => {
      const result = await refreshCompanyIntelligenceAction(companyId);
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
      id="company-intelligence"
      aria-labelledby="company-intelligence-heading"
      className="space-y-4"
    >
      <Card className="shadow-none">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle
              id="company-intelligence-heading"
              className="text-base"
            >
              Company Intelligence
            </CardTitle>
            <CardDescription>
              AI company profile for scoring, personalization, and future
              automation.
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
        <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
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
        </CardContent>
      </Card>

      {!profile ? (
        <Card className="shadow-none">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No AI analysis yet. Run{" "}
            <span className="font-medium text-foreground">
              Refresh AI Analysis
            </span>{" "}
            to build an intelligent company profile from CRM and enrichment
            signals.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <CompanyHealthCard score={healthScore} band={band} />
            <LeadPotentialCard score={leadScore} temperature={temperature} />
          </div>

          {summary ? (
            <IntelligenceSectionCard
              title="AI Summary"
              description={`Structured overview · confidence ${Math.round(summary.confidence)}%`}
            >
              <KeyValueRows
                rows={[
                  { label: "What they do", value: summary.whatTheyDo || "—" },
                  {
                    label: "Target audience",
                    value: summary.targetAudience || "—",
                  },
                  {
                    label: "Products / services",
                    value: summary.productsServices || "—",
                  },
                  {
                    label: "Business model",
                    value: summary.businessModel || "—",
                  },
                  {
                    label: "Estimated size",
                    value: summary.estimatedSize || "—",
                  },
                  {
                    label: "Market position",
                    value: summary.marketPosition || "—",
                  },
                ]}
              />
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <p className="mb-1 font-medium">Strengths</p>
                  <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                    {summary.strengths.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-1 font-medium">Weaknesses</p>
                  <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                    {summary.weaknesses.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-1 font-medium">Opportunities</p>
                  <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                    {summary.opportunities.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </IntelligenceSectionCard>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            {business ? (
              <IntelligenceSectionCard title="Business Profile">
                <KeyValueRows
                  rows={[
                    { label: "Industry", value: business.industry ?? "—" },
                    {
                      label: "Sub industry",
                      value: business.subIndustry ?? "—",
                    },
                    {
                      label: "Business category",
                      value: business.businessCategory ?? "—",
                    },
                    {
                      label: "Company type",
                      value: business.companyType ?? "—",
                    },
                    {
                      label: "B2B / B2C",
                      value: business.audience.toUpperCase(),
                    },
                    {
                      label: "Est. employees",
                      value: business.estimatedEmployees ?? "—",
                    },
                    {
                      label: "Est. revenue",
                      value: business.estimatedRevenue ?? "—",
                    },
                    {
                      label: "Founded",
                      value: business.foundedYear ?? "—",
                    },
                    { label: "Country", value: business.country ?? "—" },
                    { label: "Region", value: business.region ?? "—" },
                    {
                      label: "Languages",
                      value: business.languages.length
                        ? business.languages.join(", ")
                        : "—",
                    },
                  ]}
                />
              </IntelligenceSectionCard>
            ) : null}

            {online ? (
              <IntelligenceSectionCard
                title="Online Presence"
                description={`Website quality ${Math.round(online.websiteQualityScore)}/100`}
              >
                <KeyValueRows
                  rows={[
                    {
                      label: "Website",
                      value: yesNo(online.websiteAvailable),
                    },
                    { label: "SSL", value: yesNo(online.sslLikely) },
                    {
                      label: "Mobile friendly",
                      value: online.mobileFriendlyUnknown
                        ? "Unknown"
                        : "Detected",
                    },
                    {
                      label: "Facebook",
                      value: yesNo(online.social.facebook),
                    },
                    {
                      label: "Instagram",
                      value: yesNo(online.social.instagram),
                    },
                    {
                      label: "LinkedIn",
                      value: yesNo(online.social.linkedin),
                    },
                    { label: "X", value: yesNo(online.social.x) },
                    {
                      label: "YouTube",
                      value: yesNo(online.social.youtube),
                    },
                    {
                      label: "TikTok",
                      value: yesNo(online.social.tiktok),
                    },
                    {
                      label: "Google Business",
                      value: yesNo(online.googleBusiness),
                    },
                    {
                      label: "Review platforms",
                      value: yesNo(online.reviewPlatforms),
                    },
                  ]}
                />
              </IntelligenceSectionCard>
            ) : null}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <IntelligenceSectionCard title="AI Insights">
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
            </IntelligenceSectionCard>

            <IntelligenceSectionCard title="Growth Signals">
              {growth.length === 0 ? (
                <p className="text-muted-foreground">
                  No growth signals detected yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {growth.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-lg border border-border px-3 py-2"
                    >
                      <p className="font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.evidence}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </IntelligenceSectionCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <IntelligenceSectionCard title="Contact Quality">
              {contact && Object.keys(contact).length ? (
                <KeyValueRows
                  rows={[
                    {
                      label: "Score",
                      value:
                        contact.score != null
                          ? `${Math.round(Number(contact.score))}/100`
                          : "—",
                    },
                    {
                      label: "Email",
                      value: yesNo(Boolean(contact.emailAvailable)),
                    },
                    {
                      label: "Phone",
                      value: yesNo(Boolean(contact.phoneAvailable)),
                    },
                    {
                      label: "Decision makers",
                      value: yesNo(Boolean(contact.decisionMakersLikely)),
                    },
                    {
                      label: "LinkedIn",
                      value: yesNo(Boolean(contact.linkedinPresence)),
                    },
                    {
                      label: "Summary",
                      value: (contact.summary as string) || "—",
                    },
                  ]}
                />
              ) : (
                <p className="text-muted-foreground">No contact quality yet.</p>
              )}
            </IntelligenceSectionCard>

            <IntelligenceSectionCard
              title="AI Recommendations"
              description={
                temperature
                  ? `Lead: ${LEAD_TEMPERATURE_LABELS[temperature]}${
                      band ? ` · Health: ${HEALTH_BAND_LABELS[band]}` : ""
                    }`
                  : undefined
              }
            >
              {recommendations.length === 0 ? (
                <p className="text-muted-foreground">
                  No recommendations yet.
                </p>
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
            </IntelligenceSectionCard>
          </div>

          {Array.isArray(lead?.reasons) && lead.reasons.length > 0 ? (
            <IntelligenceSectionCard title="Why this lead score">
              <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                {lead.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </IntelligenceSectionCard>
          ) : null}
        </>
      )}
    </section>
  );
}
