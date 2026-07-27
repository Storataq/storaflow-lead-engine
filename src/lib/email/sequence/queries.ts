/**
 * Sequence queries (Phase 21D).
 */

import { createClient } from "@/lib/supabase/server";
import { parseStepsJson } from "@/lib/email/sequence/steps";
import type { Database } from "@/types/supabase";

export type EmailSequenceRow =
  Database["public"]["Tables"]["email_sequences"]["Row"];
export type EmailSequenceVersionRow =
  Database["public"]["Tables"]["email_sequence_versions"]["Row"];
export type EmailSequenceValidationRow =
  Database["public"]["Tables"]["email_sequence_validations"]["Row"];
export type EmailSequenceActivityRow =
  Database["public"]["Tables"]["email_sequence_activities"]["Row"];

export type SequenceListFilters = {
  query?: string;
  status?: string;
  category?: string;
  language?: string;
};

export async function listEmailSequences(
  organizationId: string,
  filters: SequenceListFilters = {},
): Promise<EmailSequenceRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("email_sequences")
    .select("*")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.category && filters.category !== "all") {
    query = query.eq("category", filters.category);
  }
  if (filters.language && filters.language !== "all") {
    query = query.eq("default_language", filters.language);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let rows = data ?? [];
  if (filters.query?.trim()) {
    const needle = filters.query.trim().toLowerCase();
    rows = rows.filter((row) => {
      const hay = [row.name, row.description ?? "", row.category]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }
  return rows;
}

export async function getEmailSequence(
  organizationId: string,
  sequenceId: string,
): Promise<EmailSequenceRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_sequences")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", sequenceId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function listSequenceVersions(
  organizationId: string,
  sequenceId: string,
): Promise<EmailSequenceVersionRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_sequence_versions")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("sequence_id", sequenceId)
    .order("version_number", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getSequenceVersion(
  organizationId: string,
  versionId: string,
): Promise<EmailSequenceVersionRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_sequence_versions")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", versionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function listSequenceActivities(
  organizationId: string,
  sequenceId: string,
  limit = 50,
): Promise<EmailSequenceActivityRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_sequence_activities")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("sequence_id", sequenceId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listSequenceValidations(
  organizationId: string,
  sequenceId: string,
  limit = 10,
): Promise<EmailSequenceValidationRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_sequence_validations")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("sequence_id", sequenceId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getSequenceDashboardStats(organizationId: string) {
  const sequences = await listEmailSequences(organizationId);
  const byStatus = (s: string) => sequences.filter((x) => x.status === s).length;

  let withErrors = 0;
  let totalSteps = 0;
  let totalDuration = 0;

  for (const seq of sequences) {
    const v = seq.last_validation_json;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const summary = (v as { summary?: { blockingCount?: number } }).summary;
      if ((summary?.blockingCount ?? 0) > 0) withErrors += 1;
    }
    const steps = parseStepsJson(seq.steps_json);
    totalSteps += steps.length;
    const val = seq.last_validation_json as {
      summary?: { estimatedDurationDays?: number };
    } | null;
    totalDuration += val?.summary?.estimatedDurationDays ?? 0;
  }

  const supabase = await createClient();
  const { count: campaignUsage } = await supabase
    .from("email_campaigns")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .not("sequence_id", "is", null);

  return {
    draft: byStatus("draft"),
    active: byStatus("active"),
    withErrors,
    ready: sequences.filter((s) => s.readiness_classification === "ready").length,
    avgStepCount:
      sequences.length === 0
        ? 0
        : Math.round(totalSteps / sequences.length),
    avgDurationDays:
      sequences.length === 0
        ? 0
        : Math.round(totalDuration / sequences.length),
    usedByCampaigns: campaignUsage ?? 0,
    archived: byStatus("archived"),
    total: sequences.length,
  };
}

export async function listActiveSequencesForCampaign(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_sequences")
    .select("id, name, status, version, default_language, category, readiness_score")
    .eq("organization_id", organizationId)
    .in("status", ["active", "draft"])
    .neq("status", "archived")
    .neq("status", "deprecated")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []).filter((s) => s.status === "active" || s.status === "draft");
}

export async function countCampaignsUsingSequence(
  organizationId: string,
  sequenceId: string,
): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("email_campaigns")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("sequence_id", sequenceId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function listCampaignsLinkedToSequence(
  organizationId: string,
  sequenceId: string,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_campaigns")
    .select("id, name, status, sequence_version, updated_at")
    .eq("organization_id", organizationId)
    .eq("sequence_id", sequenceId)
    .order("updated_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export function parseStopRules(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}
