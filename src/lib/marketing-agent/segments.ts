/**
 * Customer segmentation from CRM lead signals.
 */

import {
  SEGMENT_CODE_LABELS,
  SEGMENT_CODES,
  type SegmentCode,
} from "@/lib/marketing-agent/constants";
import type { LeadSignalInput, SegmentDefinition } from "@/lib/marketing-agent/types";

function daysSince(iso: string | null | undefined): number {
  if (!iso) return 999;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 999;
  return Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000));
}

function scoreOf(lead: LeadSignalInput): number {
  return lead.aiLeadScore ?? lead.leadScore ?? 0;
}

export function matchSegment(code: SegmentCode, lead: LeadSignalInput): boolean {
  const score = scoreOf(lead);
  const stale = daysSince(lead.updatedAt);
  const tags = (lead.tags ?? []).map((t) => t.toLowerCase());
  const value = lead.dealValue ?? 0;

  switch (code) {
    case "new_leads":
      return daysSince(lead.createdAt) <= 14;
    case "warm_leads":
      return score >= 40 && score < 70;
    case "hot_prospects":
      return score >= 70 || lead.scoreClassification === "very_hot" || lead.scoreClassification === "hot";
    case "inactive_customers":
      return lead.status === "customer" && stale >= 45;
    case "enterprise":
      return value >= 25000 || tags.includes("enterprise");
    case "vip":
      return tags.includes("vip") || value >= 50000;
    case "high_revenue_potential":
      return value >= 10000 || score >= 65;
    case "low_activity":
      return stale >= 21;
    case "new_customers":
      return lead.status === "customer" && daysSince(lead.createdAt) <= 60;
    case "loyal_customers":
      return lead.status === "customer" && daysSince(lead.createdAt) > 180 && stale < 30;
    case "custom":
      return true;
    default:
      return false;
  }
}

export function buildSegmentDefinitions(
  leads: LeadSignalInput[],
): SegmentDefinition[] {
  return SEGMENT_CODES.filter((c) => c !== "custom").map((code) => {
    const matched = leads.filter((l) => matchSegment(code, l));
    const avgScore =
      matched.length === 0
        ? 0
        : matched.reduce((s, l) => s + scoreOf(l), 0) / matched.length;
    return {
      code,
      name: SEGMENT_CODE_LABELS[code],
      description: `AI segment: ${SEGMENT_CODE_LABELS[code]} (${matched.length} leads)`,
      filter: {
        segment_code: code,
        rules: [`auto:${code}`],
      },
      estimatedSize: matched.length,
      aiScore: Math.max(
        20,
        Math.min(95, Math.round(35 + matched.length * 2 + avgScore * 0.35)),
      ),
    };
  });
}

export function personalizeTokens(input: {
  firstName?: string | null;
  company?: string | null;
  industry?: string | null;
  role?: string | null;
  interests?: string | null;
}): Record<string, string> {
  return {
    first_name: input.firstName?.trim() || "daar",
    company: input.company?.trim() || "jullie bedrijf",
    industry: input.industry?.trim() || "jullie branche",
    role: input.role?.trim() || "jullie rol",
    interests: input.interests?.trim() || "jullie prioriteiten",
    sender_name: "Storaflow",
  };
}

export function applyPersonalization(
  template: string,
  tokens: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => tokens[key] ?? "");
}
