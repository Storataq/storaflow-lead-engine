"use server";

import { revalidatePath } from "next/cache";

import {
  ensureEmergencyControls,
  setEmergencyStop,
} from "@/lib/email/ops/controls";
import { runQueueReconciliation } from "@/lib/email/ops/reconciliation";
import { createServiceClient } from "@/lib/supabase/admin";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

function canOperate(role: string) {
  return role === "owner" || role === "admin";
}

async function requireOpsContext() {
  const context = await getActiveOrganization();
  if (!context) {
    throw new Error("Geen actieve organisatie.");
  }
  if (!canOperate(context.membership.role)) {
    throw new Error("Alleen owners of admins mogen deze actie uitvoeren.");
  }
  return context;
}

export async function activateEmergencyStopAction(
  formData: FormData,
): Promise<void> {
  const context = await requireOpsContext();
  const reason = String(formData.get("reason") || "Manual emergency stop");
  await setEmergencyStop({
    organizationId: context.organization.id,
    actorUserId: context.membership.user_id,
    reason,
    stop: true,
  });
  revalidatePath("/email/operations");
}

export async function clearEmergencyStopAction(): Promise<void> {
  const context = await requireOpsContext();
  await setEmergencyStop({
    organizationId: context.organization.id,
    actorUserId: context.membership.user_id,
    reason: "",
    stop: false,
  });
  revalidatePath("/email/operations");
}

export async function toggleProviderDispatchAction(
  formData: FormData,
): Promise<void> {
  const context = await requireOpsContext();
  const enabled = formData.get("enabled") === "true";
  await ensureEmergencyControls(context.organization.id);
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const supabase = createServiceClient() as any;
  await supabase
    .from("email_emergency_controls")
    .update({
      provider_dispatch_enabled: enabled,
      test_mode: enabled ? false : true,
    })
    .eq("organization_id", context.organization.id);
  revalidatePath("/email/operations");
}

export async function runReconciliationDryRunAction(): Promise<void> {
  const context = await requireOpsContext();
  await runQueueReconciliation({
    organizationId: context.organization.id,
    userId: context.membership.user_id,
    mode: "dry_run",
  });
  revalidatePath("/email/operations");
}

export async function acknowledgeIncidentAction(
  formData: FormData,
): Promise<void> {
  const context = await requireOpsContext();
  const incidentId = String(formData.get("incidentId") || "");
  if (!incidentId) {
    throw new Error("Incident id ontbreekt.");
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const supabase = createServiceClient() as any;
  await supabase
    .from("email_incidents")
    .update({
      status: "investigating",
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: context.membership.user_id,
    })
    .eq("organization_id", context.organization.id)
    .eq("id", incidentId);

  revalidatePath("/email/operations");
}

export async function resolveIncidentAction(formData: FormData): Promise<void> {
  const context = await requireOpsContext();
  const incidentId = String(formData.get("incidentId") || "");
  const notes = String(formData.get("notes") || "");
  if (!incidentId) {
    throw new Error("Incident id ontbreekt.");
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const supabase = createServiceClient() as any;
  await supabase
    .from("email_incidents")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
      resolved_by: context.membership.user_id,
      resolution_notes: notes || null,
    })
    .eq("organization_id", context.organization.id)
    .eq("id", incidentId);

  revalidatePath("/email/operations");
}

export async function runE2EHarnessAction(): Promise<void> {
  const context = await requireOpsContext();
  const { runEmailE2EHarness } = await import("@/lib/email/ops/e2e-harness");
  await runEmailE2EHarness({
    organizationId: context.organization.id,
    userId: context.membership.user_id,
  });
  revalidatePath("/email/operations");
}

export async function updateTestAllowlistAction(
  formData: FormData,
): Promise<void> {
  const context = await requireOpsContext();
  const raw = String(formData.get("allowlist") || "");
  const list = raw
    .split(/[\n,;]+/)
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

  await ensureEmergencyControls(context.organization.id);
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const supabase = createServiceClient() as any;
  await supabase
    .from("email_emergency_controls")
    .update({
      test_recipient_allowlist_json: list,
      test_mode: true,
    })
    .eq("organization_id", context.organization.id);

  revalidatePath("/email/operations");
}
