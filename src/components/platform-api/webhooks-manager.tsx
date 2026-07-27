"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PLATFORM_WEBHOOK_EVENTS,
  PLATFORM_WEBHOOK_EVENT_LABELS,
  WEBHOOK_STATUS_LABELS,
  DELIVERY_STATUS_LABELS,
  type PlatformWebhookEvent,
} from "@/lib/platform-api/constants";
import {
  createPlatformWebhookAction,
  deletePlatformWebhookAction,
  duplicatePlatformWebhookAction,
  retryWebhookDeliveryAction,
  setPlatformWebhookStatusAction,
  testPlatformWebhookAction,
} from "@/lib/platform-api/actions";
import type { PlatformWebhookPublic } from "@/lib/platform-api/types";

type Delivery = {
  id: string;
  webhook_id: string;
  event_type: string;
  status: string;
  attempt_count: number;
  http_status: number | null;
  duration_ms: number | null;
  payload_size_bytes: number | null;
  error_message: string | null;
  created_at: string;
  delivered_at: string | null;
};

export function WebhooksManager({
  webhooks,
  deliveries,
  canManage,
}: {
  webhooks: PlatformWebhookPublic[];
  deliveries: Delivery[];
  canManage: boolean;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<PlatformWebhookEvent[]>([
    "company.created",
  ]);
  const [secret, setSecret] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-8">
      {secret ? (
        <div role="status" className="rounded-xl border border-border bg-muted/40 p-4">
          <p className="text-sm font-medium">Webhook signing secret (copy now)</p>
          <code className="mt-2 block break-all text-sm">{secret}</code>
        </div>
      ) : null}

      {canManage ? (
        <section className="space-y-3 rounded-xl border border-border p-4">
          <h2 className="font-semibold">Create webhook</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="wh-name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="wh-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="wh-url" className="text-sm font-medium">
                Target URL (HTTPS)
              </label>
              <Input
                id="wh-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/hooks/storaflow"
              />
            </div>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Events</legend>
            <div className="grid max-h-40 gap-1 overflow-y-auto sm:grid-cols-2">
              {PLATFORM_WEBHOOK_EVENTS.map((ev) => (
                <label key={ev} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={events.includes(ev)}
                    onChange={(e) => {
                      setEvents((prev) =>
                        e.target.checked
                          ? [...prev, ev]
                          : prev.filter((x) => x !== ev),
                      );
                    }}
                  />
                  {PLATFORM_WEBHOOK_EVENT_LABELS[ev]}
                </label>
              ))}
            </div>
          </fieldset>
          <Button
            disabled={pending || !name.trim() || !url.trim() || events.length === 0}
            onClick={() =>
              startTransition(async () => {
                const result = await createPlatformWebhookAction({
                  name,
                  targetUrl: url,
                  eventTypes: events,
                });
                if (!result.success) {
                  toast.error(result.message);
                  return;
                }
                setSecret(result.plaintextSecret ?? null);
                setName("");
                setUrl("");
                toast.success(result.message);
              })
            }
          >
            Create webhook
          </Button>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-semibold">Webhooks</h2>
        {webhooks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No webhooks configured.</p>
        ) : (
          <ul className="space-y-3">
            {webhooks.map((hook) => (
              <li
                key={hook.id}
                className="space-y-2 rounded-xl border border-border p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{hook.name}</p>
                    <p className="text-xs text-muted-foreground break-all">
                      {hook.target_url}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {WEBHOOK_STATUS_LABELS[
                      hook.status as keyof typeof WEBHOOK_STATUS_LABELS
                    ] ?? hook.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Events:{" "}
                  {Array.isArray(hook.event_types_json)
                    ? hook.event_types_json.map(String).join(", ")
                    : "—"}
                </p>
                <div className="flex flex-wrap gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!canManage || pending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await testPlatformWebhookAction({
                          webhookId: hook.id,
                        });
                        if (!result.success) toast.error(result.message);
                        else toast.success(result.message);
                      })
                    }
                  >
                    Test
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!canManage || pending}
                    onClick={() =>
                      startTransition(async () => {
                        const next =
                          hook.status === "active" ? "paused" : "active";
                        const result = await setPlatformWebhookStatusAction({
                          webhookId: hook.id,
                          status: next,
                        });
                        if (!result.success) toast.error(result.message);
                        else toast.success(result.message);
                      })
                    }
                  >
                    {hook.status === "active" ? "Pause" : "Resume"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!canManage || pending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await duplicatePlatformWebhookAction({
                          webhookId: hook.id,
                        });
                        if (!result.success) {
                          toast.error(result.message);
                          return;
                        }
                        setSecret(result.plaintextSecret ?? null);
                        toast.success(result.message);
                      })
                    }
                  >
                    Duplicate
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={!canManage || pending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await deletePlatformWebhookAction({
                          webhookId: hook.id,
                        });
                        if (!result.success) toast.error(result.message);
                        else toast.success(result.message);
                      })
                    }
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Recent deliveries</h2>
        {deliveries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No deliveries yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th className="px-3 py-2 font-medium">Event</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Attempts</th>
                  <th className="px-3 py-2 font-medium">HTTP</th>
                  <th className="px-3 py-2 font-medium">Duration</th>
                  <th className="px-3 py-2 font-medium">Size</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((d) => (
                  <tr key={d.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">{d.event_type}</td>
                    <td className="px-3 py-2">
                      <Badge variant="secondary">
                        {DELIVERY_STATUS_LABELS[
                          d.status as keyof typeof DELIVERY_STATUS_LABELS
                        ] ?? d.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 tabular-nums">{d.attempt_count}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {d.http_status ?? "—"}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {d.duration_ms != null ? `${d.duration_ms} ms` : "—"}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {d.payload_size_bytes ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!canManage || pending}
                        onClick={() =>
                          startTransition(async () => {
                            const result = await retryWebhookDeliveryAction({
                              deliveryId: d.id,
                            });
                            if (!result.success) toast.error(result.message);
                            else toast.success(result.message);
                          })
                        }
                      >
                        Retry
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
