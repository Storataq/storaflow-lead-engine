/**
 * Tool registry + calling framework with validation, retries, permissions.
 */

import { z } from "zod";

import { emitAiEvent } from "@/ai/events/bus";
import { saveMemory, recallMemory } from "@/ai/memory/engine";
import {
  assertToolPermission,
} from "@/ai/security/engine";
import type {
  AiToolDefinitionRow,
  ToolInvokeInput,
  ToolInvokeResult,
} from "@/ai/types";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

const searchInputSchema = z.object({
  query: z.string().min(1).max(500).optional(),
  limit: z.number().int().min(1).max(50).optional(),
  scope: z.string().optional(),
  content: z.string().optional(),
});

export async function listToolDefinitions(
  organizationId: string,
): Promise<AiToolDefinitionRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_tool_definitions")
    .select("*")
    .eq("is_active", true)
    .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
    .order("tool_key");
  return (data ?? []) as AiToolDefinitionRow[];
}

function parsePermissions(raw: Json): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string");
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              Object.assign(new Error("Tool timed out"), {
                code: "tool_timeout",
                retryable: true,
              }),
            ),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function executeToolHandler(
  toolKey: string,
  organizationId: string,
  input: Record<string, unknown>,
  meta: { agentId: string | null; runId: string | null; userId: string | null },
): Promise<Record<string, unknown>> {
  const supabase = await createClient();
  const limit = Math.min(Number(input.limit ?? 10) || 10, 50);
  const query = String(input.query ?? "").trim();

  switch (toolKey) {
    case "crm.search_companies": {
      let q = supabase
        .from("companies")
        .select("id, company_name, website_url, city, country")
        .eq("organization_id", organizationId)
        .limit(limit);
      if (query) q = q.ilike("company_name", `%${query}%`);
      const { data } = await q;
      return { items: data ?? [] };
    }
    case "crm.search_contacts": {
      let q = supabase
        .from("contacts")
        .select(
          "id, person_name, contact_type, contact_value, company_id, job_title",
        )
        .eq("organization_id", organizationId)
        .limit(limit);
      if (query) {
        q = q.or(
          `person_name.ilike.%${query}%,contact_value.ilike.%${query}%`,
        );
      }
      const { data } = await q;
      return { items: data ?? [] };
    }
    case "crm.search_deals": {
      let q = supabase
        .from("crm_deals")
        .select("id, title, status, value, lead_id, pipeline_id")
        .eq("organization_id", organizationId)
        .limit(limit);
      if (query) q = q.ilike("title", `%${query}%`);
      const { data } = await q;
      return { items: data ?? [] };
    }
    case "crm.list_tasks": {
      const { data } = await supabase
        .from("crm_tasks")
        .select("id, title, status, priority, due_at")
        .eq("organization_id", organizationId)
        .neq("status", "done")
        .order("due_at", { ascending: true, nullsFirst: false })
        .limit(limit);
      return { items: data ?? [] };
    }
    case "memory.save": {
      const content = String(input.content ?? "").trim();
      if (!content) throw new Error("content is required");
      const scope = String(input.scope ?? "agent");
      const row = await saveMemory({
        organizationId,
        scope: scope as "agent",
        content,
        agentId: meta.agentId,
        runId: meta.runId,
        userId: meta.userId,
      });
      return { id: row?.id ?? null };
    }
    case "memory.recall": {
      const rows = await recallMemory({
        organizationId,
        query,
        limit,
      });
      return {
        items: rows.map((r) => ({
          id: r.id,
          scope: r.memory_scope,
          content: r.content,
          summary: r.summary,
        })),
      };
    }
    case "knowledge.search": {
      let q = supabase
        .from("ai_knowledge_documents")
        .select("id, title, body, source_type")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .limit(limit);
      if (query) {
        q = q.or(`title.ilike.%${query}%,body.ilike.%${query}%`);
      }
      const { data } = await q;
      return { items: data ?? [] };
    }
    case "analytics.summary": {
      const counts = await Promise.all(
        (["companies", "contacts", "crm_deals", "crm_tasks"] as const).map(
          async (table) => {
            try {
              const { count } = await supabase
                .from(table)
                .select("*", { count: "exact", head: true })
                .eq("organization_id", organizationId);
              return [table, count ?? 0] as const;
            } catch {
              return [table, 0] as const;
            }
          },
        ),
      );
      return Object.fromEntries(counts);
    }
    default:
      throw Object.assign(new Error(`Unknown tool: ${toolKey}`), {
        code: "unknown_tool",
        retryable: false,
      });
  }
}

export async function invokeTool(
  params: ToolInvokeInput,
): Promise<ToolInvokeResult> {
  const started = Date.now();
  const tools = await listToolDefinitions(params.organizationId);
  const def = tools.find((t) => t.tool_key === params.toolKey);
  if (!def) {
    return {
      ok: false,
      output: {},
      error: `Tool not registered: ${params.toolKey}`,
      latencyMs: Date.now() - started,
    };
  }

  const required = parsePermissions(def.required_permissions_json);
  const perm = assertToolPermission(params.grantedPermissions, required);
  if (!perm.ok) {
    return {
      ok: false,
      output: {},
      error: `Missing permissions: ${perm.missing.join(", ")}`,
      latencyMs: Date.now() - started,
    };
  }

  const parsed = searchInputSchema.safeParse(params.input);
  if (!parsed.success) {
    return {
      ok: false,
      output: {},
      error: "Invalid tool input",
      latencyMs: Date.now() - started,
    };
  }

  const retries = Math.max(0, def.retry_count);
  let lastError = "Tool failed";

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const output = await withTimeout(
        executeToolHandler(params.toolKey, params.organizationId, params.input, {
          agentId: params.agentId,
          runId: params.runId,
          userId: params.userId,
        }),
        def.timeout_ms,
      );

      if (def.logging_enabled) {
        await emitAiEvent({
          organizationId: params.organizationId,
          eventType: "tool.invoked",
          agentId: params.agentId,
          runId: params.runId,
          payload: { toolKey: params.toolKey, ok: true, attempt },
        });
      }

      return { ok: true, output, latencyMs: Date.now() - started };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Tool failed";
      const retryable =
        error &&
        typeof error === "object" &&
        "retryable" in error &&
        Boolean((error as { retryable?: boolean }).retryable);
      if (!retryable || attempt === retries) break;
    }
  }

  await emitAiEvent({
    organizationId: params.organizationId,
    eventType: "tool.invoked",
    agentId: params.agentId,
    runId: params.runId,
    payload: { toolKey: params.toolKey, ok: false, error: lastError },
  });

  return {
    ok: false,
    output: {},
    error: lastError,
    latencyMs: Date.now() - started,
  };
}
