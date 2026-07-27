import { NextResponse } from "next/server";

import { runCopilotTurn } from "@/lib/copilot/engine";
import {
  appendCopilotMessages,
  createCopilotConversation,
  getCopilotConversation,
  listCopilotMessages,
} from "@/lib/copilot/queries";
import type { CopilotConversationContext } from "@/lib/copilot/types";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const runtime = "nodejs";

/**
 * Streaming Copilot chat (SSE).
 * Chunks the grounded reply for progressive UI; provider enrichment happens in-engine.
 */
export async function POST(request: Request) {
  const context = await getActiveOrganization().catch(() => null);
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    message?: string;
    conversationId?: string | null;
    mode?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  let conversationId = body.conversationId ?? null;
  if (!conversationId) {
    try {
      conversationId = await createCopilotConversation({
        organizationId: context.organization.id,
        userId: context.membership.user_id,
        title: message.slice(0, 80),
        mode: body.mode,
      });
    } catch {
      conversationId = `local-${Date.now()}`;
    }
  }

  let priorContext: CopilotConversationContext = {};
  let history: Array<{ role: string; content: string }> = [];
  if (!conversationId.startsWith("local-")) {
    try {
      const existing = await getCopilotConversation(
        context.organization.id,
        context.membership.user_id,
        conversationId,
      );
      priorContext = (existing?.context_json ?? {}) as CopilotConversationContext;
      history = (
        await listCopilotMessages(context.organization.id, conversationId, 20)
      ).map((m) => ({ role: m.role, content: m.content }));
    } catch {
      /* ignore */
    }
  }

  const turn = await runCopilotTurn({
    organizationId: context.organization.id,
    message,
    priorContext,
    history,
  });

  if (!conversationId.startsWith("local-")) {
    try {
      await appendCopilotMessages({
        organizationId: context.organization.id,
        conversationId,
        userContent: message,
        assistant: {
          content: turn.reply,
          intent: turn.intent,
          payload: {
            hits: turn.hits,
            insights: turn.insights,
            recommendations: turn.recommendations,
          },
          actionProposals: turn.actionProposals,
          providerCode: turn.providerCode,
          model: turn.model,
          latencyMs: turn.latencyMs,
        },
        context: turn.contextPatch,
      });
    } catch {
      /* migration optional */
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      send("meta", {
        conversationId,
        intent: turn.intent,
        usedProvider: turn.usedProvider,
        latencyMs: turn.latencyMs,
      });

      // Progressive text chunks for perceived streaming
      const chunkSize = 48;
      for (let i = 0; i < turn.reply.length; i += chunkSize) {
        send("token", { text: turn.reply.slice(i, i + chunkSize) });
        await new Promise((r) => setTimeout(r, 8));
      }

      send("result", {
        hits: turn.hits,
        insights: turn.insights,
        recommendations: turn.recommendations,
        actionProposals: turn.actionProposals,
      });
      send("done", { ok: true });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
