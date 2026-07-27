/**
 * Integration plugin contract — new integrations should implement this
 * with minimal custom code beyond auth + sync adapters.
 */

import type { IntegrationCategory } from "@/lib/integrations/constants";
import type { Database } from "@/types/supabase";

export type IntegrationConnectionRow =
  Database["public"]["Tables"]["integration_connections"]["Row"];
export type IntegrationSyncRunRow =
  Database["public"]["Tables"]["integration_sync_runs"]["Row"];
export type IntegrationAuditEventRow =
  Database["public"]["Tables"]["integration_audit_events"]["Row"];

export type IntegrationAuthType = "oauth2" | "api_key" | "webhook_only" | "custom";

export type IntegrationFeature =
  | "contacts_sync"
  | "companies_sync"
  | "deals_sync"
  | "email_send"
  | "calendar"
  | "file_storage"
  | "messaging"
  | "payments"
  | "accounting"
  | "automation_bridge"
  | "ai_provider"
  | "webhooks";

export type OAuthConfig = {
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
  pkce: boolean;
  /** Env var names for client id/secret — never hardcode secrets */
  clientIdEnv: string;
  clientSecretEnv: string;
};

export type IntegrationManifest = {
  code: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  developer: string;
  version: string;
  authType: IntegrationAuthType;
  features: IntegrationFeature[];
  permissions: string[];
  documentationUrl: string;
  status: "available" | "beta" | "coming_soon" | "deprecated";
  featured: boolean;
  popularRank: number;
  releasedAt: string;
  oauth?: OAuthConfig;
  supportsManualSync: boolean;
  supportsScheduledSync: boolean;
  supportsIncrementalSync: boolean;
  supportsWebhooks: boolean;
};

export type SyncAdapterResult = {
  imported: number;
  exported: number;
  warnings: string[];
  cursor?: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
};

export type IntegrationSyncAdapter = {
  run(input: {
    organizationId: string;
    connectionId: string;
    mode: "manual" | "scheduled" | "incremental" | "full" | "webhook";
    cursor?: Record<string, unknown>;
  }): Promise<SyncAdapterResult>;
};

export type IntegrationPlugin = {
  manifest: IntegrationManifest;
  /** Optional live sync — stubs return simulated success until provider wired */
  sync?: IntegrationSyncAdapter;
  buildAuthorizeUrl?(input: {
    organizationId: string;
    connectionId: string;
    redirectUri: string;
    state: string;
  }): string | null;
};
