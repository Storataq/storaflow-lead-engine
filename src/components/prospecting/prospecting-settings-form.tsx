"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateProspectingSettingsAction } from "@/lib/prospecting/actions";
import type { ProspectingOrgSettingsRow } from "@/lib/prospecting/types";
import { APPROVAL_MODE_LABELS, APPROVAL_MODES, AI_PROVIDERS, AI_PROVIDER_LABELS } from "@/ai/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProspectingSettingsForm({
  settings,
}: {
  settings: ProspectingOrgSettingsRow;
}) {
  const [enabled, setEnabled] = useState(settings.enabled);
  const [minScore, setMinScore] = useState(settings.min_lead_score);
  const [minConfidence, setMinConfidence] = useState(
    Number(settings.min_ai_confidence),
  );
  const [autoEnrich, setAutoEnrich] = useState(settings.auto_enrich);
  const [autoCrm, setAutoCrm] = useState(settings.auto_crm_suggest);
  const [approvalMode, setApprovalMode] = useState(settings.approval_mode);
  const [provider, setProvider] = useState(settings.provider);
  const [model, setModel] = useState(settings.model);
  const [rateLimit, setRateLimit] = useState(settings.rate_limit_per_minute);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid max-w-2xl gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const r = await updateProspectingSettingsAction({
            enabled,
            min_lead_score: minScore,
            min_ai_confidence: minConfidence,
            auto_enrich: autoEnrich,
            auto_crm_suggest: autoCrm,
            approval_mode: approvalMode,
            provider,
            model,
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Minimum lead score</Label>
          <Input
            type="number"
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Min AI confidence (0–1)</Label>
          <Input
            type="number"
            step="0.01"
            value={minConfidence}
            onChange={(e) => setMinConfidence(Number(e.target.value))}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={autoEnrich}
          onChange={(e) => setAutoEnrich(e.target.checked)}
        />
        Automatisch verrijken
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={autoCrm}
          onChange={(e) => setAutoCrm(e.target.checked)}
        />
        Automatisch CRM voorstellen
      </label>
      <div className="space-y-1.5">
        <Label>Autonomie</Label>
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
      <div className="space-y-1.5">
        <Label>Rate limit / minute</Label>
        <Input
          type="number"
          value={rateLimit}
          onChange={(e) => setRateLimit(Number(e.target.value))}
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
