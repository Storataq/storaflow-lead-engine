"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateCsSettingsAction } from "@/lib/customer-success/actions";
import {
  AI_PROVIDER_LABELS,
  AI_PROVIDERS,
  APPROVAL_MODE_LABELS,
  APPROVAL_MODES,
} from "@/ai/constants";
import type { CsOrgSettingsRow } from "@/lib/customer-success/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CsSettingsForm({ settings }: { settings: CsOrgSettingsRow }) {
  const [enabled, setEnabled] = useState(settings.enabled);
  const [approvalMode, setApprovalMode] = useState(settings.approval_mode);
  const [provider, setProvider] = useState(settings.provider);
  const [model, setModel] = useState(settings.model);
  const [churnThreshold, setChurnThreshold] = useState(settings.churn_threshold);
  const [renewalWindow, setRenewalWindow] = useState(settings.renewal_window_days);
  const [rateLimit, setRateLimit] = useState(settings.rate_limit_per_minute);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid max-w-2xl gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const r = await updateCsSettingsAction({
            enabled,
            approval_mode: approvalMode,
            provider,
            model,
            churn_threshold: churnThreshold,
            renewal_window_days: renewalWindow,
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
        Agent enabled
      </label>
      <div className="space-y-1.5">
        <Label>Autonomy / approval</Label>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          value={approvalMode}
          onChange={(e) => setApprovalMode(e.target.value)}
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
          <Label>Churn threshold</Label>
          <Input
            type="number"
            value={churnThreshold}
            onChange={(e) => setChurnThreshold(Number(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Renewal window (days)</Label>
          <Input
            type="number"
            value={renewalWindow}
            onChange={(e) => setRenewalWindow(Number(e.target.value))}
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
