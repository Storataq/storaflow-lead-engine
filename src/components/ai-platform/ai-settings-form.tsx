"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateAiSettingsAction } from "@/ai/actions";
import {
  AI_PROVIDER_LABELS,
  APPROVAL_MODE_LABELS,
  APPROVAL_MODES,
  AI_PROVIDERS,
  type ApprovalMode,
  type AiProviderCode,
} from "@/ai/constants";
import type { AiOrgSettingsRow } from "@/ai/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AiSettingsForm({ settings }: { settings: AiOrgSettingsRow }) {
  const [defaultProvider, setDefaultProvider] = useState(settings.default_provider);
  const [defaultModel, setDefaultModel] = useState(settings.default_model);
  const [approvalMode, setApprovalMode] = useState(settings.approval_mode);
  const [maxTokens, setMaxTokens] = useState(settings.max_tokens_per_request);
  const [rateLimit, setRateLimit] = useState(settings.rate_limit_per_minute);
  const [memoryEnabled, setMemoryEnabled] = useState(settings.memory_enabled);
  const [loggingEnabled, setLoggingEnabled] = useState(settings.logging_enabled);
  const [securityStrict, setSecurityStrict] = useState(settings.security_strict);
  const [budget, setBudget] = useState(
    settings.monthly_budget_usd != null
      ? String(settings.monthly_budget_usd)
      : "",
  );
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid max-w-2xl gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const r = await updateAiSettingsAction({
            default_provider: defaultProvider,
            default_model: defaultModel,
            approval_mode: approvalMode,
            max_tokens_per_request: maxTokens,
            rate_limit_per_minute: rateLimit,
            memory_enabled: memoryEnabled,
            logging_enabled: loggingEnabled,
            security_strict: securityStrict,
            monthly_budget_usd: budget === "" ? null : Number(budget),
          });
          if (r.success) toast.success(r.message);
          else toast.error(r.message);
        });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="provider">Default provider</Label>
        <select
          id="provider"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          value={defaultProvider}
          onChange={(e) => setDefaultProvider(e.target.value)}
        >
          {AI_PROVIDERS.map((p) => (
            <option key={p} value={p}>
              {AI_PROVIDER_LABELS[p as AiProviderCode]}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="model">Default model</Label>
        <Input
          id="model"
          value={defaultModel}
          onChange={(e) => setDefaultModel(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="approval">Approval mode</Label>
        <select
          id="approval"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          value={approvalMode}
          onChange={(e) => setApprovalMode(e.target.value)}
        >
          {APPROVAL_MODES.map((m) => (
            <option key={m} value={m}>
              {APPROVAL_MODE_LABELS[m as ApprovalMode]}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="tokens">Max tokens / request</Label>
          <Input
            id="tokens"
            type="number"
            value={maxTokens}
            onChange={(e) => setMaxTokens(Number(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rate">Rate limit / minute</Label>
          <Input
            id="rate"
            type="number"
            value={rateLimit}
            onChange={(e) => setRateLimit(Number(e.target.value))}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="budget">Monthly budget USD (optional)</Label>
        <Input
          id="budget"
          type="number"
          step="0.01"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={memoryEnabled}
          onChange={(e) => setMemoryEnabled(e.target.checked)}
        />
        Memory enabled
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={loggingEnabled}
          onChange={(e) => setLoggingEnabled(e.target.checked)}
        />
        Logging enabled
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={securityStrict}
          onChange={(e) => setSecurityStrict(e.target.checked)}
        />
        Strict security
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
