"use server";

import { z } from "zod";

import { PWA_OFFLINE_ACTION_TYPES } from "@/lib/pwa/constants";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { createClient } from "@/lib/supabase/server";
import { toUserFacingError } from "@/lib/ui/user-facing-error";
import type { Json } from "@/types/supabase";

export type PwaActionResult = {
  success: boolean;
  message: string;
  id?: string;
};

export async function savePushSubscriptionAction(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
  deviceLabel?: string;
}): Promise<PwaActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };

    const parsed = z
      .object({
        endpoint: z.string().url(),
        p256dh: z.string().min(1),
        auth: z.string().min(1),
        deviceLabel: z.string().optional(),
      })
      .parse(input);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("pwa_push_subscriptions")
      .upsert(
        {
          organization_id: context.organization.id,
          user_id: context.membership.user_id,
          endpoint: parsed.endpoint,
          p256dh: parsed.p256dh,
          auth: parsed.auth,
          device_label: parsed.deviceLabel ?? "",
          enabled: true,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "user_id,endpoint" },
      )
      .select("id")
      .single();
    if (error) throw error;
    return { success: true, message: "Push subscription saved.", id: data.id };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not save push subscription."),
    };
  }
}

export async function enqueueServerSyncAction(input: {
  clientId: string;
  actionType: string;
  payload: Record<string, unknown>;
}): Promise<PwaActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };

    const actionType = z.enum(PWA_OFFLINE_ACTION_TYPES).parse(input.actionType);
    const clientId = z.string().min(8).parse(input.clientId);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("pwa_offline_sync_queue")
      .upsert(
        {
          organization_id: context.organization.id,
          user_id: context.membership.user_id,
          client_id: clientId,
          action_type: actionType,
          payload_json: input.payload as Json,
          status: "pending",
        },
        { onConflict: "organization_id,client_id" },
      )
      .select("id")
      .single();
    if (error) throw error;

    // Scaffold: mark completed immediately for non-mutating AI queue types
    if (actionType === "ai_request_queue") {
      await supabase
        .from("pwa_offline_sync_queue")
        .update({
          status: "completed",
          processed_at: new Date().toISOString(),
        })
        .eq("id", data.id);
    }

    return {
      success: true,
      message: "Queued for sync.",
      id: data.id,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not queue sync item."),
    };
  }
}
