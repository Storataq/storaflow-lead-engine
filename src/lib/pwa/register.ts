/**
 * Service worker registration, install prompt, version detection.
 */

import { PWA_SW_PATH, PWA_SW_SCOPE } from "@/lib/pwa/constants";

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;

export function getDeferredInstallPrompt() {
  return deferredPrompt;
}

export function setDeferredInstallPrompt(
  event: BeforeInstallPromptEvent | null,
) {
  deferredPrompt = event;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register(PWA_SW_PATH, {
      scope: PWA_SW_SCOPE,
      updateViaCache: "none",
    });
    return reg;
  } catch {
    return null;
  }
}

export async function promptPwaInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const event = deferredPrompt;
  if (!event) return "unavailable";
  await event.prompt();
  const choice = await event.userChoice;
  deferredPrompt = null;
  return choice.outcome;
}

export function listenForAppInstalled(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener("appinstalled", handler);
  return () => window.removeEventListener("appinstalled", handler);
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)");
  // iOS Safari
  const iosStandalone =
    "standalone" in window.navigator &&
    Boolean(
      (window.navigator as Navigator & { standalone?: boolean }).standalone,
    );
  return mq.matches || iosStandalone;
}
