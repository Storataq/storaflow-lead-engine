"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateOrchestratorSettingsAction } from "@/lib/orchestrator/actions";
import {
  APPROVAL_POLICIES,
  APPROVAL_POLICY_LABELS,
} from "@/lib/orchestrator/constants";
import {
  AI_PROVIDER_LABELS,
  AI_PROVIDERS,
  APPROVAL_MODE_LABELS,
  APPROVAL_MODES,
} from "@/ai/constants";
import type { OrchestratorOrgSettingsRow } from "@/lib/orchestrator/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OrchestratorSettingsForm({
  settings,
}: {
  settings: OrchestratorOrgSettingsRow;
}) {
  const [enabled, setEnabled] = useState(settings.enabled);
  const [approvalPolicy, setApprovalPolicy] = useState(settings.approval_policy);
  const [autonomy, setAutonomy] = useState(settings.autonomy_level);
  const [provider, setProvider] = useState(settings.provider);
  const [model, setModel] = useState(settings.model);
  const [timeoutSec, setTimeoutSec] = useState(settings.workflow_timeout_seconds);
  const [retryLimit, setRetryLimit] = useState(settings.retry_limit);
  const [costLimit, setCostLimit] = useState(Number(settings.cost_limit_usd));
  const [rateLimit, setRateLimit] = useState(settings.rate_limit_per_minute);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid max-w-2xl gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const r = await updateOrchestratorSettingsAction({
            enabled,
            approval_policy: approvalPolicy,
            autonomy_level: autonomy,
            provider,
            model,
            workflow_timeout_seconds: timeoutSec,
            retry_limit: retryLimit,
            cost_limit_usd: costLimit,
            rate_limit_per_minute: rateLimit,
          });
          if (r.success) toast.success(r.message);
          else toast.error(r.message);
        });
      }}
    >
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        Orchestrator enabled
      </label>
      <div className="space-y-1.5">
        <Label>Approval policy</Label>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          value={approvalPolicy}
          onChange={(e) => setApprovalPolicy(e.target.value)}
        >
          {APPROVAL_POLICIES.map((m) => (
            <option key={m} value={m}>
              {APPROVAL_POLICY_LABELS[m]}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Autonomy level</Label>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          value={autonomy}
          onChange={(e) => setAutonomy(e.target.value)}
        >
          {APPROVAL_MODES.map((m) => (
            <option key={m} value={m}>
              {APPROVAL_MODE_LABELS[m]}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Provider</Label>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
        >
          {AI_PROVIDERS.map((p) => (
            <option key={p} value={p}>
              {AI_PROVIDER_LABELS[p]}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Model</Label>
        <Input value={model} onChange={(e) => setModel(e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Workflow timeout (sec)</Label>
          <Input
            type="number"
            value={timeoutSec}
            onChange={(e) => setTimeoutSec(Number(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Retry limit</Label>
          <Input
            type="number"
            value={retryLimit}
            onChange={(e) => setRetryLimit(Number(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Cost limit (USD)</Label>
          <Input
            type="number"
            step="0.01"
            value={costLimit}
            onChange={(e) => setCostLimit(Number(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Rate limit / minute</Label>
          <Input
            type="number"
            value={rateLimit}
            onChange={(e) => setRateLimit(Number(e.target.value))}
          />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
