"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { savePushSubscriptionAction } from "@/lib/pwa/actions";
import {
  PWA_PUSH_TYPE_LABELS,
  PWA_UI,
  type PwaPushType,
} from "@/lib/pwa/constants";
import { detectDeviceCapabilities } from "@/lib/pwa/device";
import {
  enqueueOfflineAction,
  flushOfflineQueue,
  listOfflineQueue,
  type OfflineQueueItem,
} from "@/lib/pwa/offline-queue";
import { subscribePushScaffold } from "@/lib/pwa/push";
import {
  isStandaloneDisplay,
  promptPwaInstall,
} from "@/lib/pwa/register";

export function PwaSettingsPanel() {
  const [online, setOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [standalone, setStandalone] = useState(() =>
    typeof window !== "undefined" ? isStandaloneDisplay() : false,
  );
  const [queue, setQueue] = useState<OfflineQueueItem[]>([]);
  const [caps] = useState<ReturnType<typeof detectDeviceCapabilities> | null>(
    () => (typeof window !== "undefined" ? detectDeviceCapabilities() : null),
  );
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    void listOfflineQueue().then(setQueue);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return (
    <div className="space-y-4">
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">{PWA_UI.hubTitle}</CardTitle>
          <CardDescription>
            Install status, offline queue, push and device readiness.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          <Badge variant="outline">{online ? "Online" : "Offline"}</Badge>
          <Badge variant="outline">
            {standalone ? "Installed / standalone" : "Browser tab"}
          </Badge>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const outcome = await promptPwaInstall();
                toast.message(
                  outcome === "unavailable"
                    ? "Install prompt not available (already installed or unsupported)."
                    : `Install: ${outcome}`,
                );
                setStandalone(isStandaloneDisplay());
              })
            }
          >
            {PWA_UI.installCta}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await subscribePushScaffold();
                toast[result.ok ? "success" : "error"](result.message);
                if (result.subscription?.endpoint && result.subscription.keys) {
                  await savePushSubscriptionAction({
                    endpoint: result.subscription.endpoint,
                    p256dh: String(result.subscription.keys.p256dh ?? ""),
                    auth: String(result.subscription.keys.auth ?? ""),
                  });
                }
              })
            }
          >
            Enable push ({PWA_UI.pushReady})
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Offline queue</CardTitle>
          <CardDescription>
            Actions queued while offline sync when connectivity returns.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await enqueueOfflineAction({
                    actionType: "note_create",
                    payload: { body: "Offline test note", demo: true },
                  });
                  setQueue(await listOfflineQueue());
                  toast.success("Demo action queued");
                })
              }
            >
              Queue demo note
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await flushOfflineQueue();
                  setQueue(await listOfflineQueue());
                  toast.success(`Synced ${r.synced}, failed ${r.failed}`);
                })
              }
            >
              Sync now
            </Button>
          </div>
          {queue.length === 0 ? (
            <p className="text-sm text-muted-foreground">{PWA_UI.queueEmpty}</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {queue.map((item) => (
                <li key={item.id}>
                  {item.actionType} · {item.status} · {item.createdAt}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Push types</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {(Object.keys(PWA_PUSH_TYPE_LABELS) as PwaPushType[]).map((key) => (
            <Badge key={key} variant="secondary">
              {PWA_PUSH_TYPE_LABELS[key]}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Device features</CardTitle>
          <CardDescription>
            {PWA_UI.cameraReady} · {PWA_UI.voiceReady} · {PWA_UI.biometricReady}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          {caps
            ? Object.entries(caps).map(([k, v]) => (
                <div
                  key={k}
                  className="flex justify-between rounded-md border border-border px-2 py-1"
                >
                  <span className="capitalize">{k.replace("_", " ")}</span>
                  <span>{v ? "Yes" : "No"}</span>
                </div>
              ))
            : null}
        </CardContent>
      </Card>
    </div>
  );
}
