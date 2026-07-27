"use client";

import {
  useCallback,
  useEffect,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PWA_UI } from "@/lib/pwa/constants";
import { flushOfflineQueue } from "@/lib/pwa/offline-queue";
import {
  listenForAppInstalled,
  promptPwaInstall,
  registerServiceWorker,
  setDeferredInstallPrompt,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa/register";

type Props = { children?: ReactNode };

export function PwaProvider({ children }: Props) {
  const [online, setOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [showInstall, setShowInstall] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [waitingWorker, setWaitingWorker] =
    useState<ServiceWorker | null>(null);
  const [pending, startTransition] = useTransition();

  const onOnline = useCallback(() => {
    setOnline(true);
    startTransition(async () => {
      const result = await flushOfflineQueue();
      if (result.synced > 0) {
        toast.success(
          `${PWA_UI.onlineBanner} (${result.synced} synced)`,
        );
      }
    });
  }, []);

  useEffect(() => {
    const goOnline = () => onOnline();
    const goOffline = () => {
      setOnline(false);
      toast.message(PWA_UI.offlineBanner);
    };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e as BeforeInstallPromptEvent);
      setShowInstall(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    const unsubInstalled = listenForAppInstalled(() => {
      setShowInstall(false);
      toast.success("Storaflow installed");
    });

    void registerServiceWorker().then((reg) => {
      if (!reg) return;
      reg.addEventListener("updatefound", () => {
        const worker = reg.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (
            worker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            setWaitingWorker(worker);
            setUpdateReady(true);
          }
        });
      });
    });

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "FLUSH_OFFLINE_QUEUE") {
        void flushOfflineQueue();
      }
    };
    navigator.serviceWorker?.addEventListener("message", onMessage);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      unsubInstalled();
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, [onOnline]);

  return (
    <>
      {children}
      {!online ? (
        <div
          role="status"
          className="fixed inset-x-0 top-0 z-50 border-b border-amber-500/30 bg-amber-500/15 px-3 py-2 text-center text-xs text-amber-950 dark:text-amber-100"
        >
          {PWA_UI.offlineBanner}
        </div>
      ) : null}
      {showInstall ? (
        <div className="fixed inset-x-3 bottom-20 z-40 rounded-lg border border-border bg-card p-3 shadow-lg sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-80 lg:bottom-4">
          <p className="text-sm font-medium">{PWA_UI.installTitle}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {PWA_UI.installDescription}
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const outcome = await promptPwaInstall();
                  if (outcome !== "accepted") setShowInstall(false);
                  else setShowInstall(false);
                })
              }
            >
              {PWA_UI.installCta}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowInstall(false)}
            >
              {PWA_UI.installDismiss}
            </Button>
          </div>
        </div>
      ) : null}
      {updateReady ? (
        <div className="fixed inset-x-3 top-14 z-40 rounded-lg border border-border bg-card p-3 shadow-lg sm:inset-x-auto sm:right-4 sm:w-80">
          <p className="text-sm">{PWA_UI.updateAvailable}</p>
          <Button
            type="button"
            size="sm"
            className="mt-2"
            onClick={() => {
              waitingWorker?.postMessage({ type: "SKIP_WAITING" });
              window.location.reload();
            }}
          >
            {PWA_UI.updateCta}
          </Button>
        </div>
      ) : null}
    </>
  );
}
