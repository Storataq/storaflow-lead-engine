"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
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
import {
  createEmailCampaignAction,
  updateEmailCampaignAction,
  type CampaignActionResult,
} from "@/lib/email/campaign/actions";
import type {
  EmailCampaignRow,
  EmailSenderProfileRow,
} from "@/lib/email/campaign/queries";
import { createDefaultCampaignReadyAudience } from "@/lib/email/audience";

type TemplateOption = {
  id: string;
  name: string;
  language: string;
  status: string;
  version: number;
  category: string | null;
};

type SequenceOption = {
  id: string;
  name: string;
  status: string;
  version: number;
  default_language: string;
  category: string;
  readiness_score: number | null;
};

type CampaignEditorFormProps = {
  mode: "create" | "edit";
  campaign?: EmailCampaignRow | null;
  templates: TemplateOption[];
  sequences?: SequenceOption[];
  senders: EmailSenderProfileRow[];
};

const initialState: CampaignActionResult = {
  success: false,
  message: "",
};

export function CampaignEditorForm({
  mode,
  campaign,
  templates,
  sequences = [],
  senders,
}: CampaignEditorFormProps) {
  const router = useRouter();
  const boundUpdate = updateEmailCampaignAction.bind(null, campaign!.id);

  async function formActionWithState(
    _prev: CampaignActionResult,
    formData: FormData,
  ): Promise<CampaignActionResult> {
    if (mode === "create") return createEmailCampaignAction(formData);
    return boundUpdate(formData);
  }

  const [state, formAction, pending] = useActionState(
    formActionWithState,
    initialState,
  );

  useEffect(() => {
    if (!state.message) return;
    if (state.success) {
      toast.success(state.message);
      if (state.id) {
        router.push(`/email/campaigns/${state.id}`);
        router.refresh();
      }
    } else {
      toast.error(state.message);
    }
  }, [state, router]);

  const defaultAudience = campaign?.audience_definition_json
    ? JSON.stringify(campaign.audience_definition_json, null, 2)
    : JSON.stringify(
        {
          ...createDefaultCampaignReadyAudience().filter,
          source: "campaign_ready",
        },
        null,
        2,
      );

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="name">Campaign name</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={campaign?.name ?? ""}
            placeholder="Hospitality pilot outreach — Q3"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            rows={2}
            defaultValue={campaign?.description ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="campaign_type">Type</Label>
          <select
            id="campaign_type"
            name="campaign_type"
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            defaultValue={campaign?.campaign_type ?? "cold_outreach"}
          >
            {EMAIL_CAMPAIGN_TYPES.map((t) => (
              <option key={t} value={t}>
                {EMAIL_CAMPAIGN_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="language">Language</Label>
          <Input
            id="language"
            name="language"
            defaultValue={campaign?.language ?? "en"}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="objective">Objective</Label>
          <Textarea
            id="objective"
            name="objective"
            rows={2}
            defaultValue={campaign?.objective ?? ""}
            placeholder="Introduce Storaflow pilot to hospitality operators"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="template_id">Template</Label>
          <select
            id="template_id"
            name="template_id"
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            defaultValue={campaign?.template_id ?? ""}
          >
            <option value="">Select template…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {t.language} · v{t.version} ({t.status})
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="sequence_id">Sequence (optional)</Label>
          <select
            id="sequence_id"
            name="sequence_id"
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            defaultValue={campaign?.sequence_id ?? ""}
          >
            <option value="">No sequence — single template only</option>
            {sequences.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · v{s.version} · {s.status} (score{" "}
                {s.readiness_score ?? 0})
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Active sequences lock on approval. Changing sequence invalidates
            approval.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="sender_profile_id">Sender profile</Label>
          <select
            id="sender_profile_id"
            name="sender_profile_id"
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            defaultValue={campaign?.sender_profile_id ?? ""}
          >
            <option value="">Select sender…</option>
            {senders.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.sender_email} ({s.status})
              </option>
            ))}
          </select>
          {senders.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No sender profiles yet.{" "}
              <Link href="/email/settings" className="underline">
                Create one
              </Link>
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="max_recipients">Max recipients</Label>
          <Input
            id="max_recipients"
            name="max_recipients"
            type="number"
            defaultValue={5000}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Input id="notes" name="notes" defaultValue={campaign?.notes ?? ""} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="audience_json">Audience definition (JSON)</Label>
        <Textarea
          id="audience_json"
          name="audience_json"
          rows={10}
          className="font-mono text-xs"
          defaultValue={defaultAudience}
        />
        <p className="text-xs text-muted-foreground">
          Default source is Campaign Ready (approved). Filters support industry,
          geography, scores, owners, tags, and manual lead IDs.
        </p>
      </div>

      <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
        <p className="mb-2">{CAMPAIGN_COMPLIANCE_NOTICE}</p>
        <label className="flex items-start gap-2 text-foreground">
          <input
            type="checkbox"
            name="compliance_ack"
            defaultChecked={campaign?.compliance_ack ?? false}
            className="mt-1"
          />
          <span>
            I acknowledge the organization remains responsible for lawful
            outreach (technical readiness only).
          </span>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending
            ? "Saving…"
            : mode === "create"
              ? "Create draft"
              : "Save campaign"}
        </Button>
        <Button
          type="button"
          variant="outline"
          nativeButton={false}
          render={
            <Link
              href={
                campaign
                  ? `/email/campaigns/${campaign.id}`
                  : "/email/campaigns"
              }
            />
          }
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
