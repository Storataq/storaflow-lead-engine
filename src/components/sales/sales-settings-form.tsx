"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateSalesSettingsAction } from "@/lib/sales-agent/actions";
import {
  AI_PROVIDER_LABELS,
  AI_PROVIDERS,
  APPROVAL_MODE_LABELS,
  APPROVAL_MODES,
} from "@/ai/constants";
import type { SalesAgentOrgSettingsRow } from "@/lib/sales-agent/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SalesSettingsForm({
  settings,
}: {
  settings: SalesAgentOrgSettingsRow;
}) {
  const [enabled, setEnabled] = useState(settings.enabled);
  const [approvalMode, setApprovalMode] = useState(settings.approval_mode);
  const [provider, setProvider] = useState(settings.provider);
  const [model, setModel] = useState(settings.model);
  const [sensitivity, setSensitivity] = useState(
    Number(settings.forecast_sensitivity),
  );
  const [riskThreshold, setRiskThreshold] = useState(settings.risk_threshold);
  const [reminderHours, setReminderHours] = useState(
    settings.reminder_frequency_hours,
  );
  const [hoursStart, setHoursStart] = useState(settings.working_hours_start);
  const [hoursEnd, setHoursEnd] = useState(settings.working_hours_end);
  const [timezone, setTimezone] = useState(settings.timezone);
  const [rateLimit, setRateLimit] = useState(settings.rate_limit_per_minute);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid max-w-2xl gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const r = await updateSalesSettingsAction({
            enabled,
            approval_mode: approvalMode,
            provider,
            model,
            forecast_sensitivity: sensitivity,
            risk_threshold: riskThreshold,
            reminder_frequency_hours: reminderHours,
            working_hours_start: hoursStart,
            working_hours_end: hoursEnd,
            timezone,
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
          <Label>Forecast sensitivity (0–1)</Label>
          <Input
            type="number"
            step="0.01"
            value={sensitivity}
            onChange={(e) => setSensitivity(Number(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Risk threshold</Label>
          <Input
            type="number"
            value={riskThreshold}
            onChange={(e) => setRiskThreshold(Number(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Reminder frequency (hours)</Label>
          <Input
            type="number"
            value={reminderHours}
            onChange={(e) => setReminderHours(Number(e.target.value))}
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
        <div className="space-y-1.5">
          <Label>Working hours start</Label>
          <Input
            type="number"
            value={hoursStart}
            onChange={(e) => setHoursStart(Number(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Working hours end</Label>
          <Input
            type="number"
            value={hoursEnd}
            onChange={(e) => setHoursEnd(Number(e.target.value))}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Timezone</Label>
        <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
