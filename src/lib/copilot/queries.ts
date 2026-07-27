/**
 * Copilot persistence queries.
 */

import { createClient } from "@/lib/supabase/server";
import { STARTER_PROMPTS } from "@/lib/copilot/constants";
import type {
  CopilotConversationContext,
  CopilotConversationRow,
  CopilotMessageRow,
} from "@/lib/copilot/types";
import type { Json } from "@/types/supabase";

export async function listCopilotConversations(
  organizationId: string,
  userId: string,
  limit = 30,
): Promise<CopilotConversationRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("copilot_conversations")
    .select(
      "id, title, status, mode, is_pinned, is_favorite, context_json, last_message_at, updated_at, created_at",
    )
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .eq("status", "active")
    .order("is_pinned", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) {
    if (error.message.includes("copilot_conversations")) return [];
    throw new Error(error.message);
  }
  return (data ?? []) as CopilotConversationRow[];
}

export async function getCopilotConversation(
  organizationId: string,
  userId: string,
  conversationId: string,
): Promise<CopilotConversationRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("copilot_conversations")
    .select(
      "id, title, status, mode, is_pinned, is_favorite, context_json, last_message_at, updated_at, created_at",
    )
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .eq("id", conversationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as CopilotConversationRow | null;
}

export async function listCopilotMessages(
  organizationId: string,
  conversationId: string,
  limit = 100,
): Promise<CopilotMessageRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("copilot_messages")
    .select(
      "id, role, content, intent, payload_json, action_proposals_json, created_at",
    )
    .eq("organization_id", organizationId)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) {
    if (error.message.includes("copilot_messages")) return [];
    throw new Error(error.message);
  }
  return (data ?? []) as CopilotMessageRow[];
}

export async function createCopilotConversation(input: {
  organizationId: string;
  userId: string;
  title?: string;
  mode?: string;
}): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("copilot_conversations")
    .insert({
      organization_id: input.organizationId,
      user_id: input.userId,
      title: input.title ?? "New conversation",
      mode: input.mode ?? "floating",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function appendCopilotMessages(input: {
  organizationId: string;
  conversationId: string;
  userContent: string;
  assistant: {
    content: string;
    intent: string;
    payload: Record<string, unknown>;
    actionProposals: unknown[];
    providerCode?: string | null;
    model?: string | null;
    latencyMs?: number;
  };
  context: CopilotConversationContext;
  title?: string;
}) {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error: userErr } = await supabase.from("copilot_messages").insert({
    organization_id: input.organizationId,
    conversation_id: input.conversationId,
    role: "user",
    content: input.userContent,
  });
  if (userErr) throw new Error(userErr.message);

  const { error: asstErr } = await supabase.from("copilot_messages").insert({
    organization_id: input.organizationId,
    conversation_id: input.conversationId,
    role: "assistant",
    content: input.assistant.content,
    intent: input.assistant.intent,
    payload_json: input.assistant.payload as Json,
    action_proposals_json: input.assistant.actionProposals as Json,
    provider_code: input.assistant.providerCode ?? null,
    model: input.assistant.model ?? null,
    latency_ms: input.assistant.latencyMs ?? null,
  });
  if (asstErr) throw new Error(asstErr.message);

  const { error: updErr } = await supabase
    .from("copilot_conversations")
    .update({
      context_json: input.context as Json,
      last_message_at: now,
      ...(input.title ? { title: input.title } : {}),
    })
    .eq("id", input.conversationId)
    .eq("organization_id", input.organizationId);
  if (updErr) throw new Error(updErr.message);
}

export function listSystemStarterPrompts() {
  return STARTER_PROMPTS.map((p) => ({
    id: p.code,
    code: p.code,
    title: p.title,
    prompt_text: p.prompt,
    category: p.category,
    is_system: true,
    is_favorite: false,
  }));
}

export async function buildCopilotDashboard(
  organizationId: string,
  userId: string,
) {
  const conversations = await listCopilotConversations(
    organizationId,
    userId,
    12,
  );
  return {
    conversations,
    starters: listSystemStarterPrompts(),
    favorites: conversations.filter((c) => c.is_favorite),
    pinned: conversations.filter((c) => c.is_pinned),
  };
}
