/**
 * Security audit + alert helpers.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/types/supabase";
import type { SecurityAlertType, SecurityAuditAction } from "@/lib/security/constants";

type Client = SupabaseClient<Database>;

export async function logSecurityAudit(
  supabase: Client,
  input: {
    organizationId?: string | null;
    actorUserId?: string | null;
    action: SecurityAuditAction | string;
    entityType?: string | null;
    entityId?: string | null;
    description: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await supabase.from("security_audit_events").insert({
    organization_id: input.organizationId ?? null,
    actor_user_id: input.actorUserId ?? null,
    action: input.action,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    description: input.description,
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
    metadata_json: (input.metadata ?? {}) as Json,
  });
}

export async function createSecurityAlert(
  supabase: Client,
  input: {
    organizationId: string;
    alertType: SecurityAlertType | string;
    title: string;
    body?: string;
    severity?: "low" | "medium" | "high" | "critical";
    entityType?: string | null;
    entityId?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await supabase.from("security_alerts").insert({
    organization_id: input.organizationId,
    alert_type: input.alertType,
    title: input.title,
    body: input.body ?? "",
    severity: input.severity ?? "medium",
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    metadata_json: (input.metadata ?? {}) as Json,
  });
}
