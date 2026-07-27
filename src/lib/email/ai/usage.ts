/**
 * Phase 21K — usage, budget, rate-limit, and idempotency helpers.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createHash } from "crypto";

import { createServiceClient } from "@/lib/supabase/admin";
import type { EmailAISettingsRow } from "@/lib/email/ai/settings";
import type { AIUsage } from "@/lib/email/ai/types";

type SupabaseLike = any;

export function buildIdempotencyKey(input: {
  organizationId: string;
  userId: string;
  generationType: string;
  fingerprint: string;
  windowMinutes?: number;
}): string {
  const window = input.windowMinutes ?? 5;
  const bucket = Math.floor(Date.now() / (window * 60_000));
  const raw = [
    input.organizationId,
    input.userId,
    input.generationType,
    input.fingerprint,
    bucket,
  ].join("|");
  return createHash("sha256").update(raw).digest("hex").slice(0, 48);
}

export function fingerprintRequest(payload: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")
    .slice(0, 32);
}

export async function findGenerationByIdempotency(
  organizationId: string,
  idempotencyKey: string,
) {
  const supabase = createServiceClient() as SupabaseLike;
  const { data } = await supabase
    .from("email_ai_generations")
    .select("id, status, approval_state, result_json, warnings_json, confidence, provider_code, model")
    .eq("organization_id", organizationId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  return data;
}

export async function sumUsageSince(
  organizationId: string,
  sinceIso: string,
  userId?: string,
): Promise<number> {
  const supabase = createServiceClient() as SupabaseLike;
  let query = supabase
    .from("email_ai_usage")
    .select("estimated_cost")
    .eq("organization_id", organizationId)
    .gte("created_at", sinceIso);

  if (userId) query = query.eq("user_id", userId);

  const { data } = await query;
  return (data ?? []).reduce(
    (sum: number, row: any) => sum + Number(row.estimated_cost ?? 0),
    0,
  );
}

export async function assertWithinBudget(input: {
  organizationId: string;
  userId: string;
  settings: EmailAISettingsRow | null;
}): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  const settings = input.settings;
  if (!settings?.hard_limit_enabled) return { ok: true };

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const dayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  const envMonthly = Number(process.env.EMAIL_AI_MONTHLY_BUDGET ?? NaN);
  const monthlyBudget =
    settings.monthly_budget ??
    (Number.isFinite(envMonthly) ? envMonthly : null);
  const dailyBudget = settings.daily_budget;
  const perUser = settings.per_user_daily_limit;

  if (monthlyBudget != null) {
    const used = await sumUsageSince(
      input.organizationId,
      monthStart.toISOString(),
    );
    if (used >= monthlyBudget) {
      return {
        ok: false,
        code: "budget_exceeded",
        message: `Monthly AI budget of ${monthlyBudget} reached.`,
      };
    }
  }

  if (dailyBudget != null) {
    const used = await sumUsageSince(
      input.organizationId,
      dayStart.toISOString(),
    );
    if (used >= dailyBudget) {
      return {
        ok: false,
        code: "budget_exceeded",
        message: `Daily AI budget of ${dailyBudget} reached.`,
      };
    }
  }

  if (perUser != null) {
    const used = await sumUsageSince(
      input.organizationId,
      dayStart.toISOString(),
      input.userId,
    );
    if (used >= perUser) {
      return {
        ok: false,
        code: "budget_exceeded",
        message: `Per-user daily AI limit of ${perUser} reached.`,
      };
    }
  }

  return { ok: true };
}

export async function countRecentGenerations(input: {
  organizationId: string;
  userId: string;
  feature: string;
  windowSeconds?: number;
}): Promise<number> {
  const supabase = createServiceClient() as SupabaseLike;
  const windowSeconds = input.windowSeconds ?? 60;
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();
  const { count } = await supabase
    .from("email_ai_generations")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", input.organizationId)
    .eq("requested_by", input.userId)
    .gte("created_at", since);
  return count ?? 0;
}

export async function assertRateLimit(input: {
  organizationId: string;
  userId: string;
  feature: string;
}): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  const recent = await countRecentGenerations({
    ...input,
    windowSeconds: 60,
  });
  if (recent >= 10) {
    return {
      ok: false,
      code: "rate_limit",
      message: "Too many AI requests in the last minute. Please wait.",
    };
  }
  return { ok: true };
}

export async function recordUsage(input: {
  organizationId: string;
  userId: string;
  generationId?: string | null;
  feature: string;
  generationType: string;
  providerCode: string;
  model: string | null;
  usage: AIUsage | null;
  status: string;
  errorCode?: string;
  campaignId?: string | null;
  sequenceId?: string | null;
  templateId?: string | null;
}) {
  const supabase = createServiceClient() as SupabaseLike;
  await supabase.from("email_ai_usage").insert({
    organization_id: input.organizationId,
    user_id: input.userId,
    generation_id: input.generationId ?? null,
    feature: input.feature,
    generation_type: input.generationType,
    provider_code: input.providerCode,
    model: input.model,
    input_tokens: input.usage?.inputTokens ?? 0,
    output_tokens: input.usage?.outputTokens ?? 0,
    estimated_cost: input.usage?.estimatedCost ?? 0,
    duration_ms: input.usage?.durationMs ?? null,
    status: input.status,
    error_code: input.errorCode ?? null,
    campaign_id: input.campaignId ?? null,
    sequence_id: input.sequenceId ?? null,
    template_id: input.templateId ?? null,
  });
}
