"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CAMPAIGN_COMPLIANCE_NOTICE,
  EMAIL_CAMPAIGN_TYPE_LABELS,
  EMAIL_CAMPAIGN_TYPES,
} from "@/lib/email/campaign/constants";
import { createEmailCampaignAction } from "@/lib/email/campaign/actions";
import type { EmailSenderProfileRow } from "@/lib/email/campaign/queries";
import { createDefaultCampaignReadyAudience } from "@/lib/email/audience";

type TemplateOption = {
  id: string;
  name: string;
  language: string;
  status: string;
  version: number;
};

const STEPS = [
  "Details",
  "Audience",
  "Template",
  "Sender",
  "Review",
] as const;

type CampaignWizardProps = {
  templates: TemplateOption[];
  senders: EmailSenderProfileRow[];
};

export function CampaignWizard({ templates, senders }: CampaignWizardProps) {
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<(typeof EMAIL_CAMPAIGN_TYPES)[number]>(
    "cold_outreach",
  );
  const [objective, setObjective] = useState("");
  const [language, setLanguage] = useState("en");
  const [audienceJson, setAudienceJson] = useState(
    JSON.stringify(
      {
        ...createDefaultCampaignReadyAudience().filter,
        source: "campaign_ready",
      },
      null,
      2,
    ),
  );
  const [templateId, setTemplateId] = useState("");
  const [senderId, setSenderId] = useState("");
  const [compliance, setCompliance] = useState(false);

  function saveDraft() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", name || "Untitled campaign");
      fd.set("description", description);
      fd.set("campaign_type", type);
      fd.set("objective", objective);
      fd.set("language", language);
      fd.set("template_id", templateId);
      fd.set("sender_profile_id", senderId);
      fd.set("audience_json", audienceJson);
      if (compliance) fd.set("compliance_ack", "on");
      const result = await createEmailCampaignAction(fd);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      if (result.id) {
        router.push(`/email/campaigns/${result.id}`);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap gap-2">
        {STEPS.map((label, index) => (
          <li key={label}>
            <button
              type="button"
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                index === step
                  ? "border-foreground/20 bg-muted font-medium"
                  : "border-transparent text-muted-foreground"
              }`}
              onClick={() => setStep(index)}
            >
              {index + 1}. {label}
            </button>
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="w-name">Name</Label>
            <Input
              id="w-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="w-desc">Description</Label>
            <Textarea
              id="w-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="w-type">Type</Label>
            <select
              id="w-type"
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={type}
              onChange={(e) =>
                setType(e.target.value as (typeof EMAIL_CAMPAIGN_TYPES)[number])
              }
            >
              {EMAIL_CAMPAIGN_TYPES.map((t) => (
                <option key={t} value={t}>
                  {EMAIL_CAMPAIGN_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="w-lang">Language</Label>
            <Input
              id="w-lang"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="w-obj">Objective</Label>
            <Textarea
              id="w-obj"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
            />
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-2">
          <Label htmlFor="w-aud">Audience JSON</Label>
          <Textarea
            id="w-aud"
            rows={12}
            className="font-mono text-xs"
            value={audienceJson}
            onChange={(e) => setAudienceJson(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Starts from approved Campaign Ready leads. Adjust filters, then
            validate on the campaign detail page.
          </p>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-2">
          <Label htmlFor="w-tpl">Template</Label>
          <select
            id="w-tpl"
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
          >
            <option value="">Select…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {t.language} · v{t.version}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-2">
          <Label htmlFor="w-sender">Sender</Label>
          <select
            id="w-sender"
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            value={senderId}
            onChange={(e) => setSenderId(e.target.value)}
          >
            <option value="">Select…</option>
            {senders.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.sender_email}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="space-y-4 rounded-lg border p-4 text-sm">
          <p>
            <span className="text-muted-foreground">Name:</span> {name || "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Type:</span>{" "}
            {EMAIL_CAMPAIGN_TYPE_LABELS[type]}
          </p>
          <p>
            <span className="text-muted-foreground">Template:</span>{" "}
            {templates.find((t) => t.id === templateId)?.name ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Sender:</span>{" "}
            {senders.find((s) => s.id === senderId)?.name ?? "—"}
          </p>
          <p className="text-muted-foreground">{CAMPAIGN_COMPLIANCE_NOTICE}</p>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={compliance}
              onChange={(e) => setCompliance(e.target.checked)}
              className="mt-1"
            />
            <span>Acknowledge legal responsibility (technical readiness only)</span>
          </label>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={() => setStep((s) => s + 1)}>
            Next
          </Button>
        ) : null}
        <Button type="button" disabled={pending} onClick={saveDraft}>
          {pending ? "Saving…" : "Save as draft"}
        </Button>
      </div>
    </div>
  );
}
