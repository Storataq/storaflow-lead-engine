import type { Metadata } from "next";

import { EmailSubnav } from "@/components/email/email-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  activateEmergencyStopAction,
  clearEmergencyStopAction,
  runReconciliationDryRunAction,
  toggleProviderDispatchAction,
  updateTestAllowlistAction,
  acknowledgeIncidentAction,
  resolveIncidentAction,
  runE2EHarnessAction,
} from "@/lib/email/ops/actions";
import { buildEmailOpsOverview } from "@/lib/email/ops/health";
import { validateEmailEnvironment } from "@/lib/email/ops/env";
import { DEFAULT_READINESS_CHECKS } from "@/lib/email/ops/readiness";
import { createServiceClient } from "@/lib/supabase/admin";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

export const metadata: Metadata = { title: "Email Operations" };

export default async function EmailOperationsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  const canOperate =
    context.membership.role === "owner" ||
    context.membership.role === "admin";

  let overview = null;
  let incidents: Array<{
    id: string;
    title: string;
    description: string | null;
    severity: string;
    status: string;
  }> = [];
  let reconRuns: Array<{
    id: string;
    run_type: string;
    mode: string;
    status: string;
    summary_json: { findingCount?: number } | null;
    created_at: string;
  }> = [];
  let errorMessage: string | null = null;
  const env = validateEmailEnvironment();

  try {
    overview = await buildEmailOpsOverview(context.organization.id);
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const supabase = createServiceClient() as any;
    const [{ data: incidentRows }, { data: reconRows }] = await Promise.all([
      supabase
        .from("email_incidents")
        .select("*")
        .eq("organization_id", context.organization.id)
        .order("last_detected_at", { ascending: false })
        .limit(20),
      supabase
        .from("email_reconciliation_runs")
        .select("id, run_type, mode, status, summary_json, created_at")
        .eq("organization_id", context.organization.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    incidents = incidentRows ?? [];
    reconRuns = reconRows ?? [];
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Could not load operations data. Apply migration 000022 if needed.",
    );
  }

  return (
    <div>
      <PageHeader
        title="Email operations"
        description="Health, kill switches, test mode, reconciliation, and incidents. Production sending stays off until explicitly enabled."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Email Engine", href: "/email" },
          { label: "Operations" },
        ]}
      />
      <EmailSubnav currentPath="/email/operations" />

      {errorMessage ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      {overview ? (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge variant="outline">Overall: {overview.overall}</Badge>
            {overview.controls.emergency_stop ? (
              <Badge variant="outline">Emergency stop</Badge>
            ) : null}
            {overview.controls.test_mode ? (
              <Badge variant="outline">Test mode</Badge>
            ) : (
              <Badge variant="outline">Live mode</Badge>
            )}
            <Badge variant="outline">
              Dispatch:{" "}
              {overview.controls.provider_dispatch_enabled ? "on" : "off"}
            </Badge>
            <Badge variant="outline">
              Circuit: {overview.controls.provider_circuit_state}
            </Badge>
          </div>

          <div className="mb-6 grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Pending queue</p>
              <p className="text-2xl font-semibold">{overview.queue.pending}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Processing</p>
              <p className="text-2xl font-semibold">
                {overview.queue.processing}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Failed / DLQ</p>
              <p className="text-2xl font-semibold">
                {overview.queue.deadLetter}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Open incidents</p>
              <p className="text-2xl font-semibold">{overview.openIncidents}</p>
            </div>
          </div>

          <div className="mb-6 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {overview.components.map((c) => (
              <div key={c.component} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{c.component}</span>
                  <Badge variant="outline">{c.status}</Badge>
                </div>
                {c.warningSummary ? (
                  <p className="mt-1 text-muted-foreground">{c.warningSummary}</p>
                ) : null}
                {c.errorSummary ? (
                  <p className="mt-1 text-destructive">{c.errorSummary}</p>
                ) : null}
              </div>
            ))}
          </div>
        </>
      ) : null}

      <div className="mb-6 rounded-lg border p-4">
        <h2 className="mb-2 font-medium">Environment validation</h2>
        <p className="mb-2 text-sm text-muted-foreground">
          Ready: {env.ready ? "yes" : "no"} · {env.blockingErrors.length}{" "}
          blocking · {env.warnings.length} warnings
        </p>
        <ul className="space-y-1 text-sm">
          {env.checks
            .filter((c) => !c.ok)
            .slice(0, 12)
            .map((c) => (
              <li key={c.key}>
                <span className="font-mono text-xs">{c.key}</span> — {c.message}
              </li>
            ))}
        </ul>
      </div>

      {canOperate ? (
        <div className="mb-8 grid gap-4 lg:grid-cols-2">
          <form
            action={activateEmergencyStopAction}
            className="space-y-3 rounded-lg border border-destructive/40 p-4"
          >
            <h3 className="font-medium text-destructive">Emergency stop</h3>
            <p className="text-sm text-muted-foreground">
              Stops new dispatch, records actor/reason, preserves history.
            </p>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Input id="reason" name="reason" required />
            </div>
            <Button type="submit" variant="destructive">
              Activate emergency stop
            </Button>
          </form>

          <div className="space-y-3 rounded-lg border p-4">
            <h3 className="font-medium">Resume / dispatch controls</h3>
            <form action={clearEmergencyStopAction}>
              <Button type="submit" variant="outline">
                Clear emergency stop
              </Button>
            </form>
            <form action={toggleProviderDispatchAction} className="flex gap-2">
              <input type="hidden" name="enabled" value="true" />
              <Button type="submit">Enable provider dispatch</Button>
            </form>
            <form action={toggleProviderDispatchAction}>
              <input type="hidden" name="enabled" value="false" />
              <Button type="submit" variant="outline">
                Disable provider dispatch (test mode)
              </Button>
            </form>
            <form action={runReconciliationDryRunAction}>
              <Button type="submit" variant="outline">
                Run queue reconciliation (dry run)
              </Button>
            </form>
            <form action={runE2EHarnessAction}>
              <Button type="submit" variant="outline">
                Run controlled E2E harness
              </Button>
            </form>
          </div>

          <form
            action={updateTestAllowlistAction}
            className="space-y-3 rounded-lg border p-4 lg:col-span-2"
          >
            <h3 className="font-medium">Test recipient allowlist</h3>
            <p className="text-sm text-muted-foreground">
              One email per line. example.com / example.org / example.net are
              always allowed in test mode.
            </p>
            <Textarea
              name="allowlist"
              rows={4}
              defaultValue={(
                overview?.controls.test_recipient_allowlist_json ?? []
              ).join("\n")}
            />
            <Button type="submit">Save allowlist</Button>
          </form>
        </div>
      ) : (
        <p className="mb-6 text-sm text-muted-foreground">
          Only owners/admins can change emergency controls.
        </p>
      )}

      <div className="mb-8">
        <h2 className="mb-3 font-medium">Incidents</h2>
        {incidents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No incidents recorded.</p>
        ) : (
          <div className="space-y-3">
            {incidents.map((incident) => (
              <div key={incident.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium">{incident.title}</h3>
                  <Badge variant="outline">{incident.severity}</Badge>
                  <Badge variant="outline">{incident.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {incident.description}
                </p>
                {canOperate && incident.status !== "resolved" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <form action={acknowledgeIncidentAction}>
                      <input
                        type="hidden"
                        name="incidentId"
                        value={incident.id}
                      />
                      <Button type="submit" size="sm" variant="outline">
                        Acknowledge
                      </Button>
                    </form>
                    <form action={resolveIncidentAction} className="flex gap-2">
                      <input
                        type="hidden"
                        name="incidentId"
                        value={incident.id}
                      />
                      <Input
                        name="notes"
                        placeholder="Resolution notes"
                        className="h-8"
                      />
                      <Button type="submit" size="sm">
                        Resolve
                      </Button>
                    </form>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-8">
        <h2 className="mb-3 font-medium">Recent reconciliation runs</h2>
        {reconRuns.length === 0 ? (
          <p className="text-sm text-muted-foreground">No runs yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {reconRuns.map((run) => (
              <li key={run.id}>
                {new Date(run.created_at).toLocaleString()} · {run.run_type} ·{" "}
                {run.mode} · {run.status} · findings{" "}
                {run.summary_json?.findingCount ?? "—"}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border p-4">
        <h2 className="mb-2 font-medium">Readiness checklist (template)</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Evidence-based statuses live in docs/EMAIL-PRODUCTION-READINESS.md.
          Do not treat lint/build alone as production ready.
        </p>
        <ul className="grid gap-1 text-sm md:grid-cols-2">
          {DEFAULT_READINESS_CHECKS.map((c) => (
            <li key={c.code}>
              <span className="font-mono text-xs">{c.code}</span> · {c.category}
              {c.blocking ? " · blocking" : ""}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
