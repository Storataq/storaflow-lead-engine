/**
 * Push notification scaffolding (VAPID-ready).
 */

import type { PwaPushType } from "@/lib/pwa/constants";

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export async function subscribePushScaffold(): Promise<{
  ok: boolean;
  message: string;
  subscription: PushSubscriptionJSON | null;
}> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return {
      ok: false,
      message: "Service worker unavailable",
      subscription: null,
    };
  }
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  if (!vapid) {
    return {
      ok: true,
      message: "Push ready — set NEXT_PUBLIC_VAPID_PUBLIC_KEY to enable.",
      subscription: null,
    };
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource,
    });
    return {
      ok: true,
      message: "Push subscription created.",
      subscription: sub.toJSON(),
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Push subscribe failed",
      subscription: null,
    };
  }
}

export const PUSH_PAYLOAD_EXAMPLES: Record<PwaPushType, string> = {
  task_reminder: "Task due soon",
  campaign_finished: "Campaign completed",
  automation_failed: "Automation failed",
  lead_alert: "New high-intent lead",
  deal_won: "Deal won",
  deal_lost: "Deal lost",
  mention: "You were mentioned",
  security_alert: "Security alert",
  billing_alert: "Billing notice",
};
