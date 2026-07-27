import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  saveAISettingsFormAction,
  saveBrandVoiceFormAction,
} from "@/lib/email/ai/actions";
import { getAIProviderDiagnostics } from "@/lib/email/ai/provider";
import {
  ensureEmailAISettings,
  listBrandVoices,
  listAIUsageSummary,
} from "@/lib/email/ai";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { toUserFacingError } from "@/lib/ui/user-facing-error";

export const metadata: Metadata = { title: "AI Settings" };

function CheckboxField({
  name,
  label,
  defaultChecked,
  disabled,
  hint,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input
        type="checkbox"
        name={name}
        value="true"
        defaultChecked={defaultChecked}
        disabled={disabled}
        className="mt-1"
      />
      <span>
        <span className="font-medium">{label}</span>
        {hint ? (
          <span className="block text-muted-foreground">{hint}</span>
        ) : null}
      </span>
    </label>
  );
}

export default async function AISettingsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  const canManage =
    context.membership.role === "owner" ||
    context.membership.role === "admin";

  let settings = null;
  let voices: Array<{
    id: string;
    voice_name: string;
    formality: string;
    is_active: boolean;
  }> = [];
  let usage = { requests: 0, estimatedCost: 0, inputTokens: 0, outputTokens: 0 };
  let errorMessage: string | null = null;
  const diagnostics = getAIProviderDiagnostics();

  try {
    settings = await ensureEmailAISettings(context.organization.id);
    voices = await listBrandVoices(context.organization.id);
    usage = await listAIUsageSummary(context.organization.id);
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Could not load AI settings. Apply migration 000021 if needed.",
    );
  }

  return (
    <div>
      <PageHeader
        title="AI settings"
        description="Optional AI assistance for email drafts, reply classification, and analytics summaries. Automatic sending remains disabled."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Settings", href: "/settings" },
          { label: "AI" },
        ]}
      />

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="/email/ai/history" />}
        >
          Generation history
        </Button>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="/email/analytics/insights" />}
        >
          AI insights
        </Button>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="/email/settings" />}
        >
          Email settings
        </Button>
      </div>

      {errorMessage ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <Alert className="mb-6">
        <AlertDescription>
          Environment: EMAIL_AI_ENABLED=
          {diagnostics.globallyEnabled ? "true" : "false"}; OpenAI{" "}
          {diagnostics.openaiConfigured ? "configured" : "not configured"};
          default model {diagnostics.defaultModel}. Automatic actions cannot be
          enabled in this phase.
        </AlertDescription>
      </Alert>

      <div className="mb-6 grid gap-3 rounded-lg border p-4 text-sm md:grid-cols-4">
        <div>
          <p className="text-muted-foreground">MTD requests</p>
          <p className="text-xl font-semibold">{usage.requests}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Est. cost (USD)</p>
          <p className="text-xl font-semibold">
            {usage.estimatedCost.toFixed(4)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Input tokens</p>
          <p className="text-xl font-semibold">{usage.inputTokens}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Output tokens</p>
          <p className="text-xl font-semibold">{usage.outputTokens}</p>
        </div>
      </div>

      {!canManage ? (
        <p className="text-sm text-muted-foreground">
          Only owners and admins can change AI settings. You can still use AI
          features when enabled.
        </p>
      ) : (
        <form action={saveAISettingsFormAction} className="space-y-6">
          <div className="space-y-3 rounded-lg border p-4">
            <h2 className="font-medium">Feature toggles</h2>
            <CheckboxField
              name="ai_enabled"
              label="Enable AI"
              defaultChecked={settings?.ai_enabled}
              hint="Requires EMAIL_AI_ENABLED=true in the environment."
            />
            <CheckboxField
              name="writing_enabled"
              label="AI writing"
              defaultChecked={settings?.writing_enabled}
            />
            <CheckboxField
              name="reply_classification_enabled"
              label="Reply classification"
              defaultChecked={settings?.reply_classification_enabled}
            />
            <CheckboxField
              name="reply_drafting_enabled"
              label="Reply drafting"
              defaultChecked={settings?.reply_drafting_enabled}
            />
            <CheckboxField
              name="analytics_insights_enabled"
              label="Analytics insights"
              defaultChecked={settings?.analytics_insights_enabled}
            />
            <CheckboxField
              name="translation_enabled"
              label="Translation"
              defaultChecked={settings?.translation_enabled}
            />
            <CheckboxField
              name="personalization_enabled"
              label="Personalization suggestions"
              defaultChecked={settings?.personalization_enabled}
            />
            <CheckboxField
              name="context_enrichment_enabled"
              label="Context enrichment"
              defaultChecked={settings?.context_enrichment_enabled}
            />
            <CheckboxField
              name="automatic_actions_enabled"
              label="Automatic actions (disabled)"
              defaultChecked={false}
              disabled
              hint="Hard-locked off. AI cannot send mail or activate sequences."
            />
          </div>

          <div className="space-y-3 rounded-lg border p-4">
            <h2 className="font-medium">Provider & model</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="preferred_provider">Preferred provider</Label>
                <select
                  id="preferred_provider"
                  name="preferred_provider"
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  defaultValue={settings?.preferred_provider ?? "openai"}
                >
                  <option value="openai">OpenAI</option>
                  <option value="none">None</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="preferred_model">Default model</Label>
                <Input
                  id="preferred_model"
                  name="preferred_model"
                  defaultValue={settings?.preferred_model ?? ""}
                  placeholder={diagnostics.defaultModel}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthly_budget">Monthly budget (USD)</Label>
                <Input
                  id="monthly_budget"
                  name="monthly_budget"
                  type="number"
                  step="0.01"
                  defaultValue={settings?.monthly_budget ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="daily_budget">Daily budget (USD)</Label>
                <Input
                  id="daily_budget"
                  name="daily_budget"
                  type="number"
                  step="0.01"
                  defaultValue={settings?.daily_budget ?? ""}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border p-4">
            <h2 className="font-medium">Data sharing (conservative defaults)</h2>
            <CheckboxField
              name="use_minimal_context"
              label="Use minimal CRM context"
              defaultChecked={settings?.use_minimal_context ?? true}
            />
            <CheckboxField
              name="use_reply_content"
              label="Allow reply content in AI context"
              defaultChecked={settings?.use_reply_content ?? false}
            />
            <CheckboxField
              name="use_analytics"
              label="Allow analytics summaries"
              defaultChecked={settings?.use_analytics ?? true}
            />
            <CheckboxField
              name="store_generated_content"
              label="Store generated content"
              defaultChecked={settings?.store_generated_content ?? true}
            />
            <CheckboxField
              name="allow_provider_training"
              label="Allow provider training (opt-in)"
              defaultChecked={settings?.allow_provider_training ?? false}
              hint="Off by default. Only enable if your provider account supports and requires it."
            />
            <div className="space-y-2">
              <Label htmlFor="organization_instructions">
                Organization instructions
              </Label>
              <Textarea
                id="organization_instructions"
                name="organization_instructions"
                rows={4}
                defaultValue={settings?.organization_instructions ?? ""}
                placeholder="Never promise SLAs. Prefer Dutch for NL audiences."
              />
            </div>
          </div>

          <Button type="submit">Save AI settings</Button>
        </form>
      )}

      {canManage ? (
        <form action={saveBrandVoiceFormAction} className="mt-8 space-y-4 rounded-lg border p-4">
          <h2 className="font-medium">Add brand voice</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="voice_name">Voice name</Label>
              <Input id="voice_name" name="voice_name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="formality">Formality</Label>
              <select
                id="formality"
                name="formality"
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                defaultValue="professional"
              >
                <option value="formal">Formal</option>
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="informal">Informal</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferred_greeting">Preferred greeting</Label>
              <Input id="preferred_greeting" name="preferred_greeting" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferred_sign_off">Preferred sign-off</Label>
              <Input id="preferred_sign_off" name="preferred_sign_off" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="example_content">Example content</Label>
              <Textarea id="example_content" name="example_content" rows={3} />
            </div>
          </div>
          <Button type="submit">Save brand voice</Button>
          {voices.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              {voices.map((v) => (
                <li key={v.id}>
                  {v.voice_name} · {v.formality}
                  {v.is_active ? " · active" : ""}
                </li>
              ))}
            </ul>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
