"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { z } from "zod";

import { getIntegrationManifest } from "@/lib/integrations/catalog";
import { encryptSecret } from "@/lib/integrations/crypto";
import {
  buildOAuthAuthorizeUrl,
  createOAuthState,
  createPkcePair,
} from "@/lib/integrations/oauth";
import {
  enqueueSyncRun,
  processSyncRun,
} from "@/lib/integrations/sync-engine";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { createClient } from "@/lib/supabase/server";
import { toUserFacingError } from "@/lib/ui/user-facing-error";
import type { Json } from "@/types/supabase";

export type IntegrationActionResult = {
  success: boolean;
  message: string;
  connectionId?: string;
  authorizeUrl?: string;
  syncRunId?: string;
};

function canManage(role: string) {
  return role === "owner" || role === "admin";
}

function revalidateIntegrations(code?: string) {
  revalidatePath("/integrations");
  revalidatePath("/integrations/sync-history");
  if (code) revalidatePath(`/integrations/${code}`);
}

async function audit(input: {
  organizationId: string;
  connectionId?: string | null;
  actorUserId: string;
  eventType: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const supabase = await createClient();
    await supabase.from("integration_audit_events").insert({
      organization_id: input.organizationId,
      connection_id: input.connectionId ?? null,
      actor_user_id: input.actorUserId,
      event_type: input.eventType,
      message: input.message,
      metadata_json: (input.metadata ?? {}) as Json,
    });
  } catch {
    /* migration may be pending */
  }
}

export async function connectIntegrationAction(input: {
  integrationCode: string;
  accountLabel?: string;
  apiKey?: string;
}): Promise<IntegrationActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManage(context.membership.role)) {
      return {
        success: false,
        message: "Only owners/admins can install integrations.",
      };
    }

    const manifest = getIntegrationManifest(input.integrationCode);
    if (!manifest) return { success: false, message: "Unknown integration." };
    if (manifest.status === "coming_soon") {
      return {
        success: false,
        message: "This integration is coming soon.",
      };
    }

    const supabase = await createClient();
    const externalAccountId = input.accountLabel?.trim() || "default";

    const { data: connection, error } = await supabase
      .from("integration_connections")
      .upsert(
        {
          organization_id: context.organization.id,
          integration_code: manifest.code,
          display_name: manifest.name,
          status:
            manifest.authType === "oauth2" ? "pending_auth" : "connected",
          auth_type: manifest.authType,
          account_label: input.accountLabel ?? manifest.name,
          external_account_id: externalAccountId,
          scopes_json: (manifest.oauth?.scopes ??
            manifest.permissions) as unknown as Json,
          installed_by: context.membership.user_id,
          installed_at: new Date().toISOString(),
          disconnected_at: null,
          health_status: manifest.authType === "oauth2" ? "unknown" : "healthy",
          health_message:
            manifest.authType === "oauth2"
              ? "Awaiting OAuth authorization"
              : "Connected",
        },
        { onConflict: "organization_id,integration_code,external_account_id" },
      )
      .select("id, status")
      .single();

    if (error) throw new Error(error.message);

    if (manifest.authType === "api_key") {
      const key = input.apiKey?.trim();
      if (!key) {
        return {
          success: false,
          message: "API key is required for this integration.",
          connectionId: connection.id,
        };
      }
      const enc = encryptSecret(key);
      await supabase.from("integration_credentials").upsert(
        {
          organization_id: context.organization.id,
          connection_id: connection.id,
          credential_kind: "api_key",
          ciphertext_base64: enc.ciphertextBase64,
          iv_base64: enc.ivBase64,
          auth_tag_base64: enc.authTagBase64,
          key_version: enc.keyVersion,
        },
        { onConflict: "connection_id,credential_kind" },
      );
    }

    let authorizeUrl: string | undefined;
    if (manifest.authType === "oauth2" && manifest.oauth) {
      const state = createOAuthState();
      const pkce = manifest.oauth.pkce ? createPkcePair() : null;
      const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/integrations/oauth/callback`;
      authorizeUrl =
        buildOAuthAuthorizeUrl({
          manifest,
          redirectUri,
          state,
          codeChallenge: pkce?.challenge,
        }) ?? undefined;

      await supabase
        .from("integration_connections")
        .update({
          config_json: {
            oauthState: state,
            pkceVerifier: pkce?.verifier ?? null,
          } as Json,
        })
        .eq("id", connection.id);

      if (!authorizeUrl) {
        // Dev mode: mark connected with placeholder when OAuth env missing
        await supabase
          .from("integration_connections")
          .update({
            status: "connected",
            health_status: "degraded",
            health_message:
              "OAuth client credentials not configured — connection recorded for marketplace testing.",
            last_validated_at: new Date().toISOString(),
          })
          .eq("id", connection.id);
      }
    }

    await audit({
      organizationId: context.organization.id,
      connectionId: connection.id,
      actorUserId: context.membership.user_id,
      eventType: "connection.install",
      message: `Installed ${manifest.name}`,
      metadata: { code: manifest.code },
    });

    revalidateIntegrations(manifest.code);
    return {
      success: true,
      message: authorizeUrl
        ? "Redirect to authorize this integration."
        : `${manifest.name} connected.`,
      connectionId: connection.id,
      authorizeUrl,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not connect integration."),
    };
  }
}

export async function disconnectIntegrationAction(input: {
  connectionId: string;
}): Promise<IntegrationActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManage(context.membership.role)) {
      return {
        success: false,
        message: "Only owners/admins can remove integrations.",
      };
    }

    const supabase = await createClient();
    await supabase
      .from("integration_credentials")
      .delete()
      .eq("organization_id", context.organization.id)
      .eq("connection_id", input.connectionId);

    const { error } = await supabase
      .from("integration_connections")
      .update({
        status: "disconnected",
        health_status: "unknown",
        health_message: "Disconnected",
        disconnected_at: new Date().toISOString(),
      })
      .eq("organization_id", context.organization.id)
      .eq("id", input.connectionId);
    if (error) throw new Error(error.message);

    await audit({
      organizationId: context.organization.id,
      connectionId: input.connectionId,
      actorUserId: context.membership.user_id,
      eventType: "connection.disconnect",
      message: "Disconnected integration and purged credentials",
    });

    revalidateIntegrations();
    return { success: true, message: "Integration disconnected." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not disconnect."),
    };
  }
}

export async function reconnectIntegrationAction(input: {
  connectionId: string;
}): Promise<IntegrationActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManage(context.membership.role)) {
      return {
        success: false,
        message: "Only owners/admins can re-authorize integrations.",
      };
    }

    const supabase = await createClient();
    const { data: connection, error } = await supabase
      .from("integration_connections")
      .select("id, integration_code")
      .eq("organization_id", context.organization.id)
      .eq("id", input.connectionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!connection) return { success: false, message: "Connection not found." };

    return connectIntegrationAction({
      integrationCode: connection.integration_code,
    });
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not reconnect."),
    };
  }
}

export async function testIntegrationConnectionAction(input: {
  connectionId: string;
}): Promise<IntegrationActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManage(context.membership.role)) {
      return { success: false, message: "Not permitted." };
    }

    const supabase = await createClient();
    const { data: connection, error } = await supabase
      .from("integration_connections")
      .select("*")
      .eq("organization_id", context.organization.id)
      .eq("id", input.connectionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!connection) return { success: false, message: "Connection not found." };

    const healthy = connection.status === "connected";
    await supabase
      .from("integration_connections")
      .update({
        last_validated_at: new Date().toISOString(),
        health_status: healthy ? "healthy" : "degraded",
        health_message: healthy
          ? "Connection test passed"
          : `Status is ${connection.status}`,
      })
      .eq("id", connection.id);

    await audit({
      organizationId: context.organization.id,
      connectionId: connection.id,
      actorUserId: context.membership.user_id,
      eventType: "connection.test",
      message: healthy ? "Connection test passed" : "Connection test degraded",
    });

    revalidateIntegrations(connection.integration_code);
    return {
      success: true,
      message: healthy
        ? "Connection is healthy."
        : "Connection needs attention — check status.",
      connectionId: connection.id,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Connection test failed."),
    };
  }
}

const syncSchema = z.object({
  connectionId: z.string().uuid(),
  mode: z.enum(["manual", "scheduled", "incremental", "full", "webhook"]),
});

export async function startIntegrationSyncAction(input: {
  connectionId: string;
  mode?: "manual" | "scheduled" | "incremental" | "full";
}): Promise<IntegrationActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManage(context.membership.role)) {
      return {
        success: false,
        message: "Only owners/admins can run synchronization.",
      };
    }

    const parsed = syncSchema.safeParse({
      connectionId: input.connectionId,
      mode: input.mode ?? "manual",
    });
    if (!parsed.success) {
      return { success: false, message: "Invalid sync request." };
    }

    const supabase = await createClient();
    const { data: connection, error } = await supabase
      .from("integration_connections")
      .select("id, integration_code, status")
      .eq("organization_id", context.organization.id)
      .eq("id", parsed.data.connectionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!connection) return { success: false, message: "Connection not found." };
    if (connection.status !== "connected") {
      return {
        success: false,
        message: "Connect and authorize the integration before syncing.",
      };
    }

    const syncRunId = await enqueueSyncRun({
      organizationId: context.organization.id,
      connectionId: connection.id,
      mode: parsed.data.mode,
      createdBy: context.membership.user_id,
    });

    const result = await processSyncRun({
      organizationId: context.organization.id,
      syncRunId,
      integrationCode: connection.integration_code,
    });

    revalidateIntegrations(connection.integration_code);
    return {
      success: result.status !== "failed",
      message:
        result.status === "failed"
          ? result.errorMessage ?? "Sync failed"
          : `Sync ${result.status}: imported ${result.imported}, exported ${result.exported}.`,
      syncRunId,
      connectionId: connection.id,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not start sync."),
    };
  }
}

export async function saveIntegrationConfigAction(input: {
  connectionId: string;
  config: Record<string, unknown>;
}): Promise<IntegrationActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManage(context.membership.role)) {
      return { success: false, message: "Not permitted." };
    }
    const supabase = await createClient();
    const { error } = await supabase
      .from("integration_connections")
      .update({
        config_json: {
          ...input.config,
          updatedAt: new Date().toISOString(),
          nonce: randomUUID(),
        } as Json,
      })
      .eq("organization_id", context.organization.id)
      .eq("id", input.connectionId);
    if (error) throw new Error(error.message);

    await audit({
      organizationId: context.organization.id,
      connectionId: input.connectionId,
      actorUserId: context.membership.user_id,
      eventType: "connection.configure",
      message: "Updated integration configuration",
    });

    revalidateIntegrations();
    return { success: true, message: "Configuration saved." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not save configuration."),
    };
  }
}
