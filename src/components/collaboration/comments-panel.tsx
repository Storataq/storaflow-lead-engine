"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  createCommentAction,
  resolveThreadAction,
  softDeleteCommentAction,
  togglePinCommentAction,
} from "@/lib/collaboration/actions";
import { COLLAB_UI } from "@/lib/collaboration/constants";
import type { CollabEntityType } from "@/lib/collaboration/constants";
import type { CommentRow } from "@/lib/collaboration/types";
import {
  identifyUnansweredQuestions,
  suggestNextActions,
  summarizeDiscussion,
} from "@/lib/collaboration/ai";
import { formatDateTime } from "@/lib/ui/format";
import { cn } from "@/lib/utils";

type Props = {
  entityType: CollabEntityType;
  entityId: string;
  comments: CommentRow[];
  canComment?: boolean;
  currentUserId?: string | null;
};

export function CommentsPanel({
  entityType,
  entityId,
  comments,
  canComment = true,
  currentUserId,
}: Props) {
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [showAi, setShowAi] = useState(false);

  const roots = useMemo(
    () => comments.filter((c) => !c.parent_id),
    [comments],
  );
  const childrenOf = (id: string) =>
    comments.filter((c) => c.parent_id === id);

  const ai = useMemo(() => {
    const texts = comments.map((c) => c.body_text);
    return {
      summary: summarizeDiscussion(texts),
      next: suggestNextActions(texts),
      questions: identifyUnansweredQuestions(texts),
    };
  }, [comments]);

  function submit() {
    const text = body.trim();
    if (!text) return;
    startTransition(async () => {
      const result = await createCommentAction({
        entityType,
        entityId,
        bodyText: text,
        bodyHtml: `<p>${text.replace(/</g, "&lt;")}</p>`,
        parentId: replyTo,
      });
      if (result.success) {
        toast.success(result.message);
        setBody("");
        setReplyTo(null);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <section className="space-y-4" aria-label={COLLAB_UI.commentsTitle}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{COLLAB_UI.commentsTitle}</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowAi((v) => !v)}
        >
          AI assist
        </Button>
      </div>

      {showAi ? (
        <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
          <p className="font-medium">{ai.summary.title}</p>
          <p className="text-muted-foreground">{ai.summary.body}</p>
          <p className="font-medium">{ai.next.title}</p>
          <ul className="list-disc pl-5 text-muted-foreground">
            {ai.next.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {ai.questions.items.length > 0 ? (
            <>
              <p className="font-medium">{ai.questions.title}</p>
              <ul className="list-disc pl-5 text-muted-foreground">
                {ai.questions.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}

      {roots.length === 0 ? (
        <p className="text-sm text-muted-foreground">{COLLAB_UI.emptyComments}</p>
      ) : (
        <ul className="space-y-3">
          {roots.map((comment) => (
            <li
              key={comment.id}
              className={cn(
                "rounded-lg border border-border px-3 py-2 text-sm",
                comment.is_pinned && "border-primary/40 bg-muted/40",
                comment.is_resolved && "opacity-70",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                {comment.is_pinned ? <Badge>Pinned</Badge> : null}
                {comment.is_resolved ? (
                  <Badge variant="secondary">Resolved</Badge>
                ) : null}
                {comment.edited_at ? (
                  <Badge variant="outline">Edited</Badge>
                ) : null}
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(comment.created_at)}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap">{comment.body_text}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={!canComment || pending}
                  onClick={() => setReplyTo(comment.id)}
                >
                  Reply
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const r = await togglePinCommentAction(
                        comment.id,
                        !comment.is_pinned,
                      );
                      toast[r.success ? "success" : "error"](r.message);
                    })
                  }
                >
                  {comment.is_pinned
                    ? COLLAB_UI.unpinComment
                    : COLLAB_UI.pinComment}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const r = await resolveThreadAction(
                        comment.id,
                        !comment.is_resolved,
                      );
                      toast[r.success ? "success" : "error"](r.message);
                    })
                  }
                >
                  {COLLAB_UI.resolveThread}
                </Button>
                  {(!currentUserId ||
                    comment.created_by === currentUserId) && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          const r = await softDeleteCommentAction(comment.id);
                          toast[r.success ? "success" : "error"](r.message);
                        })
                      }
                    >
                      Delete
                    </Button>
                  )}
              </div>
              <ul className="mt-2 space-y-2 border-l border-border pl-3">
                {childrenOf(comment.id).map((child) => (
                  <li key={child.id} className="text-sm">
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(child.created_at)}
                    </span>
                    <p className="whitespace-pre-wrap">{child.body_text}</p>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      {canComment ? (
        <div className="space-y-2">
          {replyTo ? (
            <p className="text-xs text-muted-foreground">
              Replying to thread ·{" "}
              <button
                type="button"
                className="underline"
                onClick={() => setReplyTo(null)}
              >
                Cancel
              </button>
            </p>
          ) : null}
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a comment… Use @user:uuid @team:code or @everyone"
            rows={3}
            aria-label="New comment"
          />
          <Button type="button" disabled={pending || !body.trim()} onClick={submit}>
            Post comment
          </Button>
        </div>
      ) : null}
    </section>
  );
}
