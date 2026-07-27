"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Bookmark,
  Maximize2,
  MessageSquare,
  Minimize2,
  PanelRight,
  Pin,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  COPILOT_MODE_LABELS,
  COPILOT_MUTATING_ACTIONS,
  COPILOT_UI_STORAGE_KEY,
  QUICK_ACTIONS,
  STARTER_PROMPTS,
  type CopilotActionType,
  type CopilotMode,
} from "@/lib/copilot";
import {
  confirmCopilotActionAction,
  sendCopilotMessageAction,
  toggleCopilotConversationFlagsAction,
} from "@/lib/copilot/actions";
import type { CopilotActionProposal, CopilotSearchHit } from "@/lib/copilot/types";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  hits?: CopilotSearchHit[];
  proposals?: CopilotActionProposal[];
};

type PersistedUi = {
  open: boolean;
  mode: CopilotMode;
  width: number;
};

const DEFAULT_UI: PersistedUi = {
  open: false,
  mode: "floating",
  width: 420,
};

function loadUi(): PersistedUi {
  try {
    const raw = localStorage.getItem(COPILOT_UI_STORAGE_KEY);
    if (!raw) return DEFAULT_UI;
    return { ...DEFAULT_UI, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_UI;
  }
}

function saveUi(ui: PersistedUi) {
  try {
    localStorage.setItem(COPILOT_UI_STORAGE_KEY, JSON.stringify(ui));
  } catch {
    /* ignore */
  }
}

export function AiCopilotShell() {
  const [ui, setUi] = useState<PersistedUi>(DEFAULT_UI);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [pendingConfirm, setPendingConfirm] =
    useState<CopilotActionProposal | null>(null);
  const [pending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);
  const idSeq = useRef(0);

  const updateUi = (patch: Partial<PersistedUi> | ((prev: PersistedUi) => PersistedUi)) => {
    setUi((prev) => {
      const next = typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
      saveUi(next);
      return next;
    });
  };

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, streaming]);

  const panelStyle = useMemo(() => {
    if (ui.mode === "fullscreen") {
      return "fixed inset-3 z-50 flex flex-col rounded-xl border bg-background shadow-xl";
    }
    if (ui.mode === "docked") {
      return "fixed bottom-0 right-0 top-14 z-50 flex w-full max-w-md flex-col border-l bg-background shadow-xl sm:max-w-lg";
    }
    if (ui.mode === "sidebar") {
      return cn(
        "fixed bottom-4 right-4 z-50 flex max-h-[min(85vh,720px)] flex-col rounded-xl border bg-background shadow-xl",
      );
    }
    return "fixed bottom-20 right-4 z-50 flex max-h-[min(75vh,640px)] flex-col rounded-xl border bg-background shadow-xl lg:bottom-20";
  }, [ui.mode]);

  const widthStyle =
    ui.mode === "fullscreen" || ui.mode === "docked"
      ? undefined
      : { width: Math.min(Math.max(ui.width, 320), 560) };

  async function streamMessage(text: string) {
    setStreaming(true);
    idSeq.current += 1;
    const userMsg: ChatMessage = {
      id: `u-${idSeq.current}`,
      role: "user",
      content: text,
    };
    idSeq.current += 1;
    const asstId = `a-${idSeq.current}`;
    setMessages((m) => [
      ...m,
      userMsg,
      { id: asstId, role: "assistant", content: "" },
    ]);

    try {
      const res = await fetch("/api/internal/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationId,
          mode: ui.mode,
        }),
      });

      if (!res.ok || !res.body) {
        const result = await sendCopilotMessageAction({
          message: text,
          conversationId,
          mode: ui.mode,
        });
        if (!result.success) {
          toast.error(result.message);
          setMessages((m) =>
            m.map((msg) =>
              msg.id === asstId
                ? { ...msg, content: result.message }
                : msg,
            ),
          );
          return;
        }
        if (result.conversationId) setConversationId(result.conversationId);
        setMessages((m) =>
          m.map((msg) =>
            msg.id === asstId
              ? {
                  ...msg,
                  content: result.reply ?? "",
                  hits: (result.hits as CopilotSearchHit[]) ?? [],
                  proposals:
                    (result.actionProposals as CopilotActionProposal[]) ?? [],
                }
              : msg,
          ),
        );
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const lines = part.split("\n");
          let event = "message";
          let data = "";
          for (const line of lines) {
            if (line.startsWith("event:")) event = line.slice(6).trim();
            if (line.startsWith("data:")) data += line.slice(5).trim();
          }
          if (!data) continue;
          const payload = JSON.parse(data) as Record<string, unknown>;
          if (event === "meta" && typeof payload.conversationId === "string") {
            if (!payload.conversationId.startsWith("local-")) {
              setConversationId(payload.conversationId);
            }
          }
          if (event === "token" && typeof payload.text === "string") {
            setMessages((m) =>
              m.map((msg) =>
                msg.id === asstId
                  ? { ...msg, content: msg.content + payload.text }
                  : msg,
              ),
            );
          }
          if (event === "result") {
            const nextHits = (payload.hits as CopilotSearchHit[]) ?? [];
            const nextProposals =
              (payload.actionProposals as CopilotActionProposal[]) ?? [];
            setMessages((m) =>
              m.map((msg) =>
                msg.id === asstId
                  ? { ...msg, hits: nextHits, proposals: nextProposals }
                  : msg,
              ),
            );
          }
        }
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Copilot request failed",
      );
    } finally {
      setStreaming(false);
    }
  }

  const onSubmit = (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || streaming) return;
    setInput("");
    void streamMessage(value);
  };

  const confirmAction = (proposal: CopilotActionProposal) => {
    setPendingConfirm(proposal);
  };

  const executeConfirmed = () => {
    if (!pendingConfirm) return;
    const proposal = pendingConfirm;
    startTransition(async () => {
      const result = await confirmCopilotActionAction({
        actionType: proposal.actionType,
        preview: proposal.preview,
        conversationId: conversationId ?? undefined,
        proposalId: proposal.id,
        confirmed: true,
      });
      setPendingConfirm(null);
      if (result.success) {
        toast.success(result.message);
        if (result.reply?.startsWith("/")) {
          window.location.href = result.reply;
        }
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <>
      {/* FAB */}
      {!ui.open ? (
        <Button
          type="button"
          size="lg"
          className="fixed bottom-20 right-4 z-50 h-12 min-h-12 gap-2 rounded-full px-4 shadow-lg motion-safe:transition-transform motion-safe:hover:scale-[1.02] lg:bottom-4"
          onClick={() => {
            const stored = loadUi();
            updateUi({ ...stored, open: true });
          }}
          aria-label="Open Storaflow AI Copilot"
        >
          <Sparkles className="size-4" aria-hidden />
          Copilot
        </Button>
      ) : null}

      {ui.open ? (
        <section
          className={panelStyle}
          style={widthStyle}
          aria-label="Storaflow AI Copilot"
        >
          <header className="flex items-center gap-2 border-b px-3 py-2">
            <Sparkles className="size-4 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">AI Copilot</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {COPILOT_MODE_LABELS[ui.mode]} · writes require confirmation
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Sidebar mode"
                onClick={() => updateUi({ mode: "sidebar" })}
              >
                <PanelRight className="size-3.5" />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Docked mode"
                onClick={() => updateUi({ mode: "docked" })}
              >
                <Minimize2 className="size-3.5" />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Full screen"
                onClick={() => updateUi({ mode: "fullscreen" })}
              >
                <Maximize2 className="size-3.5" />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Floating mode"
                onClick={() => updateUi({ mode: "floating" })}
              >
                <MessageSquare className="size-3.5" />
              </Button>
              {conversationId ? (
                <>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Pin conversation"
                    onClick={() =>
                      startTransition(async () => {
                        await toggleCopilotConversationFlagsAction({
                          conversationId,
                          pinned: true,
                        });
                        toast.message("Conversation pinned");
                      })
                    }
                  >
                    <Pin className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Favorite conversation"
                    onClick={() =>
                      startTransition(async () => {
                        await toggleCopilotConversationFlagsAction({
                          conversationId,
                          favorite: true,
                        });
                        toast.message("Added to favorites");
                      })
                    }
                  >
                    <Bookmark className="size-3.5" />
                  </Button>
                </>
              ) : null}
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Close Copilot"
                onClick={() => updateUi({ open: false })}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          </header>

          {ui.mode !== "docked" && ui.mode !== "fullscreen" ? (
            <div className="flex items-center gap-2 border-b px-3 py-1.5">
              <label className="text-[11px] text-muted-foreground" htmlFor="copilot-width">
                Width
              </label>
              <input
                id="copilot-width"
                type="range"
                min={320}
                max={560}
                value={ui.width}
                onChange={(e) =>
                  updateUi({ width: Number(e.target.value) })
                }
                className="w-full"
                aria-label="Resize Copilot panel"
              />
            </div>
          ) : null}

          <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            {messages.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Ask in natural language across CRM, campaigns, scoring, and
                  automations.
                </p>
                <div className="flex flex-wrap gap-2">
                  {STARTER_PROMPTS.slice(0, 4).map((p) => (
                    <Button
                      key={p.code}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onSubmit(p.prompt)}
                    >
                      {p.title}
                    </Button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {QUICK_ACTIONS.slice(0, 4).map((a) => (
                    <Badge
                      key={a.id}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => onSubmit(a.prompt)}
                    >
                      {a.label}
                    </Badge>
                  ))}
                </div>
                <Button
                  nativeButton={false}
                  size="sm"
                  variant="link"
                  render={<Link href="/copilot" />}
                >
                  Open Copilot dashboard
                </Button>
              </div>
            ) : null}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm",
                  msg.role === "user"
                    ? "ml-6 bg-foreground text-background"
                    : "mr-2 border bg-muted/40",
                )}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.hits && msg.hits.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-xs">
                    {msg.hits.slice(0, 6).map((h) => (
                      <li key={`${h.type}-${h.id}`}>
                        <Link
                          href={h.href}
                          className="underline underline-offset-2"
                        >
                          {h.title}
                        </Link>
                        {h.subtitle ? (
                          <span className="text-muted-foreground">
                            {" "}
                            · {h.subtitle}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {msg.proposals && msg.proposals.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {msg.proposals.map((p) => (
                      <div
                        key={p.id}
                        className="rounded-md border bg-background p-2 text-xs"
                      >
                        <p className="font-medium">{p.title}</p>
                        <p className="text-muted-foreground">{p.description}</p>
                        {COPILOT_MUTATING_ACTIONS.has(
                          p.actionType as CopilotActionType,
                        ) || p.actionType === "generate_email" ? (
                          <Button
                            type="button"
                            size="sm"
                            className="mt-2"
                            variant="outline"
                            onClick={() => confirmAction(p)}
                          >
                            Review & confirm
                          </Button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {streaming ? (
              <p className="text-xs text-muted-foreground" aria-live="polite">
                Thinking…
              </p>
            ) : null}
          </div>

          <footer className="border-t p-2">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                onSubmit();
              }}
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Storaflow…"
                aria-label="Copilot message"
                disabled={streaming}
              />
              <Button
                type="submit"
                size="icon"
                disabled={streaming || !input.trim()}
                aria-label="Send"
              >
                <Send className="size-4" />
              </Button>
            </form>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Voice-ready architecture · multi-provider ready ·{" "}
              <Link href="/settings/ai" className="underline">
                AI settings
              </Link>
            </p>
          </footer>
        </section>
      ) : null}

      {/* Confirmation dialog */}
      {pendingConfirm ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-background/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="copilot-confirm-title"
        >
          <div className="w-full max-w-md rounded-xl border bg-background p-4 shadow-xl">
            <h2 id="copilot-confirm-title" className="text-base font-semibold">
              Confirm action
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {pendingConfirm.title}
            </p>
            <p className="mt-2 text-sm">{pendingConfirm.description}</p>
            <pre className="mt-3 max-h-40 overflow-auto rounded-md bg-muted p-2 text-[11px]">
              {JSON.stringify(pendingConfirm.preview, null, 2)}
            </pre>
            {pendingConfirm.bulk ? (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                Bulk operation — review the preview carefully.
              </p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPendingConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={pending}
                onClick={executeConfirmed}
              >
                Confirm & continue
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
