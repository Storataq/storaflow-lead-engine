"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { generateApiKeyMaterial } from "@/lib/platform-api/keys";
import { scopesForTier } from "@/lib/platform-api/scopes";
import {
  API_PERMISSION_TIERS,
  PLATFORM_WEBHOOK_EVENTS,
  DEFAULT_RATE_LIMIT_PER_DAY,
  DEFAULT_RATE_LIMIT_PER_MINUTE,
} from "@/lib/platform-api/constants";
import {
  assertHttpsUrl,
  encryptWebhookSecret,
  generateWebhookSecret,
} from "@/lib/platform-api/webhook-security";
import {
  deliverWebhookAttempt,
  enqueueWebhookDeliveriesForEvent,
} from "@/lib/platform-api/delivery";
import { publishPlatformEvent } from "@/lib/platform-api/event-bus";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { createClient } from "@/lib/supabase/server";
import { toUserFacingError } from "@/lib/ui/user-facing-error";
import type { Json } from "@/types/supabase";

export type PlatformActionResult = {
  success: boolean;
  message: string;
  plaintextKey?: string;
  plaintextSecret?: string;
  id?: string;
};

function canManage(role: string) {
  return role === "owner" || role === "admin";
}

function revalidateAll() {
  revalidatePath("/api-management");
  revalidatePath("/api-management/keys");
  revalidatePath("/api-management/webhooks");
  revalidatePath("/api-management/logs");
  revalidatePath("/api-management/usage");
  revalidatePath("/api-management/docs");
}

async function audit(input: {
  organizationId: string;
  actorUserId: string;
  apiKeyId?: string | null;
  eventType: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const supabase = await createClient();
    await supabase.from("platform_api_audit_events").insert({
      organization_id: input.organizationId,
      actor_user_id: input.actorUserId,
      api_key_id: input.apiKeyId ?? null,
      event_type: input.eventType,
      message: input.message,
      metadata_json: (input.metadata ?? {}) as Json,
    });
  } catch {
    /* migration pending */
  }
}

const createKeySchema = z.object({
  name: z.string().trim().min(1).max(120),
  permissionTier: z.enum(API_PERMISSION_TIERS),
  scopes: z.array(z.string()).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  rateLimitPerMinute: z.number().int().min(1).max(10_000).optional(),
  rateLimitPerDay: z.number().int().min(1).max(1_000_000).optional(),
});

export async function createPlatformApiKeyAction(
  raw: unknown,
): Promise<PlatformActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManage(context.membership.role)) {
      return {
        success: false,
        message: "Only owners/admins can create API keys.",
      };
    }
    const parsed = createKeySchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, message: "Invalid API key request." };
    }

    const material = generateApiKeyMaterial();
    const scopes = scopesForTier(
      parsed.data.permissionTier,
      parsed.data.scopes,
    );
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("platform_api_keys")
      .insert({
        organization_id: context.organization.id,
        name: parsed.data.name,
        key_prefix: material.prefix,
        key_hash: material.hash,
        permission_tier: parsed.data.permissionTier,
        scopes_json: scopes as unknown as Json,
        expires_at: parsed.data.expiresAt ?? null,
        created_by: context.membership.user_id,
        rate_limit_per_minute:
          parsed.data.rateLimitPerMinute ?? DEFAULT_RATE_LIMIT_PER_MINUTE,
        rate_limit_per_day:
          parsed.data.rateLimitPerDay ?? DEFAULT_RATE_LIMIT_PER_DAY,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await audit({
      organizationId: context.organization.id,
      actorUserId: context.membership.user_id,
      apiKeyId: data.id,
      eventType: "api_key.created",
      message: `Created API key “${parsed.data.name}”`,
    });

    revalidateAll();
    return {
      success: true,
      message: "API key created. Copy it now — it will not be shown again.",
      plaintextKey: material.plaintext,
      id: data.id,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not create API key."),
    };
  }
}

export async function revokePlatformApiKeyAction(input: {
  apiKeyId: string;
}): Promise<PlatformActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManage(context.membership.role)) {
      return { success: false, message: "Not permitted." };
    }
    const supabase = await createClient();
    const { error } = await supabase
      .from("platform_api_keys")
      .update({
        status: "revoked",
        revoked_at: new Date().toISOString(),
        revoked_by: context.membership.user_id,
      })
      .eq("organization_id", context.organization.id)
      .eq("id", input.apiKeyId);
    if (error) throw new Error(error.message);

    await audit({
      organizationId: context.organization.id,
      actorUserId: context.membership.user_id,
      apiKeyId: input.apiKeyId,
      eventType: "api_key.revoked",
      message: "Revoked API key",
    });
    revalidateAll();
    return { success: true, message: "API key revoked." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not revoke API key."),
    };
  }
}

export async function rotatePlatformApiKeyAction(input: {
  apiKeyId: string;
  reason?: string;
}): Promise<PlatformActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManage(context.membership.role)) {
      return { success: false, message: "Not permitted." };
    }
    const supabase = await createClient();
    const { data: existing, error } = await supabase
      .from("platform_api_keys")
      .select("*")
      .eq("organization_id", context.organization.id)
      .eq("id", input.apiKeyId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!existing) return { success: false, message: "API key not found." };

    const material = generateApiKeyMaterial();
    await supabase.from("platform_api_key_rotations").insert({
      organization_id: context.organization.id,
      api_key_id: existing.id,
      previous_key_prefix: existing.key_prefix,
      rotated_by: context.membership.user_id,
      reason: input.reason ?? "Rotated by admin",
    });

    const { error: updErr } = await supabase
      .from("platform_api_keys")
      .update({
        key_prefix: material.prefix,
        key_hash: material.hash,
        status: "active",
        revoked_at: null,
        revoked_by: null,
      })
      .eq("id", existing.id);
    if (updErr) throw new Error(updErr.message);

    await audit({
      organizationId: context.organization.id,
      actorUserId: context.membership.user_id,
      apiKeyId: existing.id,
      eventType: "api_key.rotated",
      message: "Rotated API key",
    });
    revalidateAll();
    return {
      success: true,
      message: "API key rotated. Copy the new secret now.",
      plaintextKey: material.plaintext,
      id: existing.id,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not rotate API key."),
    };
  }
}

const webhookSchema = z.object({
  name: z.string().trim().min(1).max(120),
  targetUrl: z.string().url(),
  eventTypes: z.array(z.enum(PLATFORM_WEBHOOK_EVENTS)).min(1),
  httpsOnly: z.boolean().optional(),
});

export async function createPlatformWebhookAction(
  raw: unknown,
): Promise<PlatformActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManage(context.membership.role)) {
      return { success: false, message: "Not permitted." };
    }
    const parsed = webhookSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, message: "Invalid webhook configuration." };
    }
    const httpsOnly = parsed.data.httpsOnly ?? true;
    const urlError = assertHttpsUrl(parsed.data.targetUrl, httpsOnly);
    if (urlError) return { success: false, message: urlError };

    const secret = generateWebhookSecret();
    const enc = encryptWebhookSecret(secret);
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("platform_webhooks")
      .insert({
        organization_id: context.organization.id,
        name: parsed.data.name,
        target_url: parsed.data.targetUrl,
        event_types_json: parsed.data.eventTypes as unknown as Json,
        https_only: httpsOnly,
        secret_ciphertext_base64: enc.ciphertextBase64,
        secret_iv_base64: enc.ivBase64,
        secret_auth_tag_base64: enc.authTagBase64,
        secret_key_version: enc.keyVersion,
        secret_prefix: enc.prefix,
        created_by: context.membership.user_id,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await audit({
      organizationId: context.organization.id,
      actorUserId: context.membership.user_id,
      eventType: "webhook.created",
      message: `Created webhook “${parsed.data.name}”`,
      metadata: { webhookId: data.id },
    });
    revalidateAll();
    return {
      success: true,
      message: "Webhook created. Store the signing secret securely.",
      plaintextSecret: secret,
      id: data.id,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not create webhook."),
    };
  }
}

export async function setPlatformWebhookStatusAction(input: {
  webhookId: string;
  status: "active" | "paused" | "disabled";
}): Promise<PlatformActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManage(context.membership.role)) {
      return { success: false, message: "Not permitted." };
    }
    const supabase = await createClient();
    const { error } = await supabase
      .from("platform_webhooks")
      .update({ status: input.status })
      .eq("organization_id", context.organization.id)
      .eq("id", input.webhookId);
    if (error) throw new Error(error.message);
    await audit({
      organizationId: context.organization.id,
      actorUserId: context.membership.user_id,
      eventType: `webhook.${input.status}`,
      message: `Webhook status → ${input.status}`,
      metadata: { webhookId: input.webhookId },
    });
    revalidateAll();
    return { success: true, message: `Webhook ${input.status}.` };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not update webhook."),
    };
  }
}

export async function deletePlatformWebhookAction(input: {
  webhookId: string;
}): Promise<PlatformActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManage(context.membership.role)) {
      return { success: false, message: "Not permitted." };
    }
    const supabase = await createClient();
    const { error } = await supabase
      .from("platform_webhooks")
      .delete()
      .eq("organization_id", context.organization.id)
      .eq("id", input.webhookId);
    if (error) throw new Error(error.message);
    await audit({
      organizationId: context.organization.id,
      actorUserId: context.membership.user_id,
      eventType: "webhook.deleted",
      message: "Deleted webhook",
      metadata: { webhookId: input.webhookId },
    });
    revalidateAll();
    return { success: true, message: "Webhook deleted." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not delete webhook."),
    };
  }
}

export async function duplicatePlatformWebhookAction(input: {
  webhookId: string;
}): Promise<PlatformActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManage(context.membership.role)) {
      return { success: false, message: "Not permitted." };
    }
    const supabase = await createClient();
    const { data: source, error } = await supabase
      .from("platform_webhooks")
      .select("*")
      .eq("organization_id", context.organization.id)
      .eq("id", input.webhookId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!source) return { success: false, message: "Webhook not found." };

    const secret = generateWebhookSecret();
    const enc = encryptWebhookSecret(secret);
    const { data, error: insErr } = await supabase
      .from("platform_webhooks")
      .insert({
        organization_id: context.organization.id,
        name: `${source.name} (copy)`,
        target_url: source.target_url,
        event_types_json: source.event_types_json,
        https_only: source.https_only,
        status: "paused",
        secret_ciphertext_base64: enc.ciphertextBase64,
        secret_iv_base64: enc.ivBase64,
        secret_auth_tag_base64: enc.authTagBase64,
        secret_key_version: enc.keyVersion,
        secret_prefix: enc.prefix,
        created_by: context.membership.user_id,
      })
      .select("id")
      .single();
    if (insErr) throw new Error(insErr.message);
    revalidateAll();
    return {
      success: true,
      message: "Webhook duplicated (paused). New signing secret issued.",
      plaintextSecret: secret,
      id: data.id,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not duplicate webhook."),
    };
  }
}

export async function testPlatformWebhookAction(input: {
  webhookId: string;
}): Promise<PlatformActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManage(context.membership.role)) {
      return { success: false, message: "Not permitted." };
    }

    await publishPlatformEvent({
      organizationId: context.organization.id,
      eventType: "company.updated",
      payload: {
        test: true,
        webhookId: input.webhookId,
        message: "Storaflow webhook test event",
      },
    });

    // Also enqueue specifically for this webhook via delivery helper
    await enqueueWebhookDeliveriesForEvent({
      organizationId: context.organization.id,
      eventType: "company.updated",
      payload: { test: true, source: "manual_test" },
    });

    const supabase = await createClient();
    const { data: delivery } = await supabase
      .from("platform_webhook_deliveries")
      .select("id")
      .eq("organization_id", context.organization.id)
      .eq("webhook_id", input.webhookId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (delivery) {
      const result = await deliverWebhookAttempt({
        organizationId: context.organization.id,
        deliveryId: delivery.id,
      });
      revalidateAll();
      return {
        success: result.ok,
        message: result.ok
          ? `Test delivered (HTTP ${result.statusCode}).`
          : `Test failed: ${result.error}`,
      };
    }

    revalidateAll();
    return {
      success: true,
      message: "Test event queued. Ensure the webhook listens for company.updated.",
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Webhook test failed."),
    };
  }
}

export async function retryWebhookDeliveryAction(input: {
  deliveryId: string;
}): Promise<PlatformActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManage(context.membership.role)) {
      return { success: false, message: "Not permitted." };
    }
    const result = await deliverWebhookAttempt({
      organizationId: context.organization.id,
      deliveryId: input.deliveryId,
    });
    revalidateAll();
    return {
      success: result.ok,
      message: result.ok
        ? "Delivery succeeded."
        : `Retry failed: ${result.error}`,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Retry failed."),
    };
  }
}
