import { NextResponse } from "next/server";

import { getIntegrationManifest } from "@/lib/integrations/catalog";
import { encryptSecret } from "@/lib/integrations/crypto";
import { exchangeAuthorizationCode } from "@/lib/integrations/oauth";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

/**
 * OAuth 2.0 callback — exchanges code, stores encrypted tokens, never returns secrets to browser.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const appBase = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;
  const fail = (message: string) =>
    NextResponse.redirect(
      `${appBase}/integrations?oauth=error&message=${encodeURIComponent(message)}`,
    );

  if (error) return fail(error);
  if (!code || !state) return fail("Missing OAuth code or state.");

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return fail("Not authenticated.");

    const { data: connection, error: connErr } = await supabase
      .from("integration_connections")
      .select("id, organization_id, integration_code, config_json")
      .contains("config_json", { oauthState: state })
      .maybeSingle();

    if (connErr || !connection) {
      return fail("OAuth state not recognized.");
    }

    const manifest = getIntegrationManifest(connection.integration_code);
    if (!manifest) return fail("Unknown integration.");

    const config = (connection.config_json ?? {}) as Record<string, unknown>;
    const redirectUri = `${appBase}/api/integrations/oauth/callback`;
    const tokens = await exchangeAuthorizationCode({
      manifest,
      code,
      redirectUri,
      codeVerifier:
        typeof config.pkceVerifier === "string"
          ? config.pkceVerifier
          : undefined,
    });

    if (!tokens) {
      await supabase
        .from("integration_connections")
        .update({
          status: "connected",
          health_status: "degraded",
          health_message:
            "OAuth callback received but token exchange skipped (provider credentials missing).",
          last_validated_at: new Date().toISOString(),
          config_json: {
            ...config,
            oauthState: null,
            pkceVerifier: null,
          } as Json,
        })
        .eq("id", connection.id);
      return NextResponse.redirect(
        `${appBase}/integrations/${manifest.code}?oauth=connected_degraded`,
      );
    }

    const access = encryptSecret(tokens.accessToken);
    await supabase.from("integration_credentials").upsert(
      {
        organization_id: connection.organization_id,
        connection_id: connection.id,
        credential_kind: "access_token",
        ciphertext_base64: access.ciphertextBase64,
        iv_base64: access.ivBase64,
        auth_tag_base64: access.authTagBase64,
        key_version: access.keyVersion,
        expires_at: tokens.expiresIn
          ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
          : null,
      },
      { onConflict: "connection_id,credential_kind" },
    );

    if (tokens.refreshToken) {
      const refresh = encryptSecret(tokens.refreshToken);
      await supabase.from("integration_credentials").upsert(
        {
          organization_id: connection.organization_id,
          connection_id: connection.id,
          credential_kind: "refresh_token",
          ciphertext_base64: refresh.ciphertextBase64,
          iv_base64: refresh.ivBase64,
          auth_tag_base64: refresh.authTagBase64,
          key_version: refresh.keyVersion,
        },
        { onConflict: "connection_id,credential_kind" },
      );
    }

    await supabase
      .from("integration_connections")
      .update({
        status: "connected",
        health_status: "healthy",
        health_message: "OAuth authorization completed",
        last_validated_at: new Date().toISOString(),
        scopes_json: (tokens.scope
          ? tokens.scope.split(" ")
          : manifest.oauth?.scopes ?? []) as unknown as Json,
        config_json: {
          ...config,
          oauthState: null,
          pkceVerifier: null,
        } as Json,
      })
      .eq("id", connection.id);

    await supabase.from("integration_audit_events").insert({
      organization_id: connection.organization_id,
      connection_id: connection.id,
      actor_user_id: user.id,
      event_type: "connection.oauth_complete",
      message: `OAuth completed for ${manifest.name}`,
      metadata_json: {} as Json,
    });

    return NextResponse.redirect(
      `${appBase}/integrations/${manifest.code}?oauth=success`,
    );
  } catch {
    return fail("OAuth callback failed.");
  }
}
