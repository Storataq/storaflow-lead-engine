"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  archiveNotificationAction,
  createDemoNotificationAction,
  dismissNotificationAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/lib/collaboration/actions";
import {
  COLLAB_UI,
  NOTIFICATION_PRIORITY_LABELS,
  type NotificationPriority,
} from "@/lib/collaboration/constants";
import type { NotificationRow } from "@/lib/collaboration/types";
import { formatDateTime } from "@/lib/ui/format";
import { cn } from "@/lib/utils";

type Props = {
  notifications: NotificationRow[];
};

export function NotificationsCenter({ notifications }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await markAllNotificationsReadAction();
              toast[r.success ? "success" : "error"](r.message);
            })
          }
        >
          {COLLAB_UI.markAllRead}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await createDemoNotificationAction();
              toast[r.success ? "success" : "error"](r.message);
            })
          }
        >
          Send test notification
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Channels: in-app active · email / push / Slack / Teams ready via
        channel_flags.
      </p>

      {notifications.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {COLLAB_UI.emptyNotifications}
        </p>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={cn(
                "rounded-lg border border-border px-3 py-2 text-sm",
                !n.is_read && "bg-muted/40",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={n.is_read ? "secondary" : "default"}>
                  {n.is_read ? "Read" : "Unread"}
                </Badge>
                <Badge variant="outline">
                  {NOTIFICATION_PRIORITY_LABELS[
                    n.priority as NotificationPriority
                  ] ?? n.priority}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(n.created_at)}
                </span>
              </div>
              <p className="mt-1 font-medium">{n.title}</p>
              {n.body ? (
                <p className="text-muted-foreground">{n.body}</p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2">
                {!n.is_read ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const r = await markNotificationReadAction(n.id);
                        toast[r.success ? "success" : "error"](r.message);
                      })
                    }
                  >
                    Mark read
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const r = await archiveNotificationAction(n.id);
                      toast[r.success ? "success" : "error"](r.message);
                    })
                  }
                >
                  Archive
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const r = await dismissNotificationAction(n.id);
                      toast[r.success ? "success" : "error"](r.message);
                    })
                  }
                >
                  Dismiss
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
