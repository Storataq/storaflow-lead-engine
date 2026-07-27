/**
 * Knowledge engine — ingest + RAG-ready lexical retrieval.
 */

import type { KnowledgeSourceType } from "@/ai/constants";
import { rankMemoryRelevance } from "@/ai/memory/engine";
import type { AiKnowledgeDocumentRow } from "@/ai/types";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

export async function upsertKnowledgeDocument(params: {
  organizationId: string;
  sourceType: KnowledgeSourceType;
  title: string;
  body: string;
  sourceRef?: string | null;
  tags?: string[];
}): Promise<AiKnowledgeDocumentRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_knowledge_documents")
    .insert({
      organization_id: params.organizationId,
      source_type: params.sourceType,
      title: params.title,
      body: params.body,
      source_ref: params.sourceRef ?? null,
      tags_json: (params.tags ?? []) as Json,
    })
    .select("*")
    .single();
  if (error) return null;
  return data as AiKnowledgeDocumentRow;
}

export async function searchKnowledge(params: {
  organizationId: string;
  query: string;
  limit?: number;
}): Promise<Array<AiKnowledgeDocumentRow & { score: number }>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_knowledge_documents")
    .select("*")
    .eq("organization_id", params.organizationId)
    .eq("is_active", true)
    .is("deleted_at", null)
    .limit(100);

  const rows = (data ?? []) as AiKnowledgeDocumentRow[];
  return rows
    .map((row) => ({
      ...row,
      score: rankMemoryRelevance(`${row.title}\n${row.body}`, params.query),
    }))
    .filter((r) => r.score > 0 || !params.query.trim())
    .sort((a, b) => b.score - a.score)
    .slice(0, params.limit ?? 10);
}

/**
 * Future vector path: store embeddings in embedding_json / pgvector.
 * Lexical ranking remains the production default until embeddings land.
 */
export function isRagReady(): boolean {
  return true;
}
