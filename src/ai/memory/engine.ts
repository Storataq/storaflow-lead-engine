/**
 * Memory engine — store / retrieve / rank / expire / summarize.
 */

import type { MemoryScope } from "@/ai/constants";
import type { AiMemoryEntryRow } from "@/ai/types";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9àáäâèéëêìíïîòóöôùúüûñç]+/i)
    .filter((t) => t.length > 2);
}

export function rankMemoryRelevance(content: string, query: string): number {
  if (!query.trim()) return 0;
  const q = new Set(tokenize(query));
  const c = tokenize(content);
  if (q.size === 0 || c.length === 0) return 0;
  let hits = 0;
  for (const token of c) {
    if (q.has(token)) hits += 1;
  }
  return Math.round((hits / Math.max(q.size, 1)) * 1000) / 1000;
}

export function summarizeMemory(content: string, maxLen = 240): string {
  const cleaned = content.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLen) return cleaned;
  return `${cleaned.slice(0, maxLen - 1)}…`;
}

export async function saveMemory(params: {
  organizationId: string;
  scope: MemoryScope;
  content: string;
  scopeKey?: string;
  agentId?: string | null;
  runId?: string | null;
  userId?: string | null;
  companyId?: string | null;
  rankScore?: number;
  expiresAt?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<AiMemoryEntryRow | null> {
  const supabase = await createClient();
  const summary = summarizeMemory(params.content);
  const { data, error } = await supabase
    .from("ai_memory_entries")
    .insert({
      organization_id: params.organizationId,
      memory_scope: params.scope,
      scope_key: params.scopeKey ?? "",
      agent_id: params.agentId ?? null,
      run_id: params.runId ?? null,
      user_id: params.userId ?? null,
      company_id: params.companyId ?? null,
      content: params.content,
      summary,
      rank_score: params.rankScore ?? 0,
      expires_at: params.expiresAt ?? null,
      metadata_json: (params.metadata ?? {}) as Json,
    })
    .select("*")
    .single();
  if (error) return null;
  return data as AiMemoryEntryRow;
}

export async function recallMemory(params: {
  organizationId: string;
  scope?: MemoryScope;
  scopeKey?: string;
  query?: string;
  limit?: number;
}): Promise<AiMemoryEntryRow[]> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  let q = supabase
    .from("ai_memory_entries")
    .select("*")
    .eq("organization_id", params.organizationId)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order("rank_score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(Math.min(params.limit ?? 20, 100));

  if (params.scope) q = q.eq("memory_scope", params.scope);
  if (params.scopeKey) q = q.eq("scope_key", params.scopeKey);

  const { data } = await q;
  const rows = (data ?? []) as AiMemoryEntryRow[];
  if (!params.query?.trim()) return rows;

  return rows
    .map((row) => ({
      row,
      score: Math.max(
        Number(row.rank_score) || 0,
        rankMemoryRelevance(row.content, params.query!),
      ),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, params.limit ?? 10)
    .map((x) => x.row);
}

export async function purgeExpiredMemory(
  organizationId: string,
): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_memory_entries")
    .delete()
    .eq("organization_id", organizationId)
    .lt("expires_at", new Date().toISOString())
    .select("id");
  return data?.length ?? 0;
}
