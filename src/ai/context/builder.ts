/**
 * Context engine — assemble org/user/CRM/memory/knowledge into a bundle.
 */

import { recallMemory } from "@/ai/memory/engine";
import type { AgentContextBundle } from "@/ai/types";
import { createClient } from "@/lib/supabase/server";

async function safeCount(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any,
  table: string,
  organizationId: string,
): Promise<number> {
  try {
    const { count } = await from(table)
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function buildAgentContext(params: {
  organizationId: string;
  organizationName: string;
  userId?: string | null;
  userRole?: string | null;
  locale?: string;
  timezone?: string;
  permissions?: string[];
  agentId?: string | null;
  query?: string;
  activeWorkflowSlug?: string | null;
}): Promise<AgentContextBundle> {
  const supabase = await createClient();
  const from = supabase.from.bind(supabase);

  const [companies, contacts, deals, openTasks, memories, knowledge] =
    await Promise.all([
      safeCount(from, "companies", params.organizationId),
      safeCount(from, "contacts", params.organizationId),
      safeCount(from, "crm_deals", params.organizationId),
      (async () => {
        try {
          const { count } = await supabase
            .from("crm_tasks")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", params.organizationId)
            .neq("status", "done");
          return count ?? 0;
        } catch {
          return 0;
        }
      })(),
      recallMemory({
        organizationId: params.organizationId,
        query: params.query,
        limit: 8,
      }),
      (async () => {
        try {
          const { data } = await supabase
            .from("ai_knowledge_documents")
            .select("title, body")
            .eq("organization_id", params.organizationId)
            .eq("is_active", true)
            .is("deleted_at", null)
            .order("updated_at", { ascending: false })
            .limit(5);
          return (data ?? []).map(
            (d) => `${d.title}: ${String(d.body).slice(0, 280)}`,
          );
        } catch {
          return [] as string[];
        }
      })(),
    ]);

  return {
    organizationId: params.organizationId,
    organizationName: params.organizationName,
    userId: params.userId ?? null,
    userRole: params.userRole ?? null,
    locale: params.locale ?? "nl",
    timezone: params.timezone ?? "Europe/Amsterdam",
    permissions: params.permissions ?? [],
    memorySnippets: memories.map((m) => m.summary ?? m.content.slice(0, 240)),
    knowledgeSnippets: knowledge,
    crmSnapshot: {
      companies,
      contacts,
      deals,
      openTasks,
    },
    activeWorkflowSlug: params.activeWorkflowSlug ?? null,
  };
}

export function formatContextForPrompt(ctx: AgentContextBundle): string {
  return [
    `Organization: ${ctx.organizationName} (${ctx.organizationId})`,
    `User: ${ctx.userId ?? "system"} role=${ctx.userRole ?? "n/a"}`,
    `Locale/TZ: ${ctx.locale} / ${ctx.timezone}`,
    `Permissions: ${ctx.permissions.join(", ") || "none"}`,
    `CRM: companies=${ctx.crmSnapshot.companies}, contacts=${ctx.crmSnapshot.contacts}, deals=${ctx.crmSnapshot.deals}, openTasks=${ctx.crmSnapshot.openTasks}`,
    ctx.activeWorkflowSlug
      ? `Active workflow: ${ctx.activeWorkflowSlug}`
      : null,
    ctx.memorySnippets.length
      ? `Memory:\n- ${ctx.memorySnippets.join("\n- ")}`
      : null,
    ctx.knowledgeSnippets.length
      ? `Knowledge:\n- ${ctx.knowledgeSnippets.join("\n- ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}
