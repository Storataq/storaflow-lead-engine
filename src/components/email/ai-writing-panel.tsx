"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AI_REWRITE_OPS,
  AI_TONES,
  AI_GENERATION_TYPE_LABELS,
} from "@/lib/email/ai/constants";
import {
  approveAIGenerationAction,
  generateEmailAIAction,
  rejectAIGenerationAction,
  type AIActionResult,
} from "@/lib/email/ai/actions";

type Variant = {
  index: number;
  label?: string;
  subject?: string;
  previewText?: string;
  htmlBody?: string;
  plainText?: string;
  cta?: string;
  warnings?: string[];
  assumptions?: string[];
};

type AIWritingPanelProps = {
  templateId?: string;
  sequenceId?: string;
  initialSubject?: string;
  initialPreview?: string;
  initialBody?: string;
  onApplyVariant?: (variant: Variant) => void;
};

export function AIWritingPanel({
  templateId,
  sequenceId,
  initialSubject = "",
  initialPreview = "",
  initialBody = "",
  onApplyVariant,
}: AIWritingPanelProps) {
  const [pending, startTransition] = useTransition();
  const [generationType, setGenerationType] = useState<
    | "subject_line"
    | "preview_text"
    | "email_body"
    | "email_rewrite"
    | "sequence_draft"
    | "follow_up_email"
  >("email_body");
  const [tone, setTone] = useState("professional");
  const [rewriteOp, setRewriteOp] = useState("improve_clarity");
  const [purpose, setPurpose] = useState("");
  const [cta, setCta] = useState("");
  const [variants, setVariants] = useState<Variant[]>([]);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [selected, setSelected] = useState(0);

  function runGenerate() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("generationType", generationType);
      fd.set("tone", tone);
      fd.set("campaignPurpose", purpose);
      fd.set("callToAction", cta);
      fd.set("existingSubject", initialSubject);
      fd.set("existingPreview", initialPreview);
      fd.set("existingBody", initialBody);
      fd.set("variantCount", "3");
      if (generationType === "email_rewrite") {
        fd.set("rewriteOp", rewriteOp);
      }
      if (templateId) fd.set("templateId", templateId);
      if (sequenceId) fd.set("sequenceId", sequenceId);

      const result: AIActionResult = await generateEmailAIAction(fd);
      if (!result.success) {
        toast.error(result.message);
        setWarnings(result.warnings ?? []);
        return;
      }
      toast.success(result.message);
      setGenerationId(result.generationId ?? null);
      setVariants((result.variants as Variant[]) ?? []);
      setWarnings(result.warnings ?? []);
      setSelected(0);
    });
  }

  async function approve() {
    if (!generationId) return;
    const result = await approveAIGenerationAction(generationId);
    if (result.success) toast.success(result.message);
    else toast.error(result.message);
  }

  async function reject() {
    if (!generationId) return;
    const result = await rejectAIGenerationAction(generationId);
    if (result.success) toast.success(result.message);
    else toast.error(result.message);
  }

  const current = variants[selected];

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div>
        <h3 className="font-medium">AI writing assistant</h3>
        <p className="text-sm text-muted-foreground">
          Generates draft variants for human review. Never sends or activates
          content automatically.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ai-type">Generation type</Label>
          <select
            id="ai-type"
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            value={generationType}
            onChange={(e) =>
              setGenerationType(e.target.value as typeof generationType)
            }
          >
            {(
              [
                "subject_line",
                "preview_text",
                "email_body",
                "email_rewrite",
                "follow_up_email",
                "sequence_draft",
              ] as const
            ).map((t) => (
              <option key={t} value={t}>
                {AI_GENERATION_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ai-tone">Tone</Label>
          <select
            id="ai-tone"
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
          >
            {AI_TONES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        {generationType === "email_rewrite" ? (
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="ai-rewrite">Rewrite operation</Label>
            <select
              id="ai-rewrite"
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={rewriteOp}
              onChange={(e) => setRewriteOp(e.target.value)}
            >
              {AI_REWRITE_OPS.map((op) => (
                <option key={op} value={op}>
                  {op.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="ai-purpose">Campaign purpose</Label>
          <Input
            id="ai-purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="Introduce warehouse automation to mid-market logistics"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="ai-cta">Call to action</Label>
          <Input
            id="ai-cta"
            value={cta}
            onChange={(e) => setCta(e.target.value)}
            placeholder="Book a 15-minute intro call"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={runGenerate} disabled={pending}>
          {pending ? "Generating…" : "Generate drafts"}
        </Button>
        {generationId ? (
          <>
            <Button type="button" variant="outline" onClick={approve}>
              Approve
            </Button>
            <Button type="button" variant="outline" onClick={reject}>
              Reject
            </Button>
          </>
        ) : null}
      </div>

      {warnings.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 text-sm text-amber-700 dark:text-amber-400">
          {warnings.slice(0, 6).map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}

      {variants.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {variants.map((v, idx) => (
              <Button
                key={v.index}
                type="button"
                size="sm"
                variant={selected === idx ? "default" : "outline"}
                onClick={() => setSelected(idx)}
              >
                {v.label ?? `Variant ${idx + 1}`}
              </Button>
            ))}
          </div>
          {current ? (
            <div className="space-y-2 rounded-md border bg-muted/20 p-3">
              {current.subject ? (
                <div>
                  <p className="text-xs text-muted-foreground">Subject</p>
                  <p className="text-sm font-medium">{current.subject}</p>
                </div>
              ) : null}
              {current.previewText ? (
                <div>
                  <p className="text-xs text-muted-foreground">Preview</p>
                  <p className="text-sm">{current.previewText}</p>
                </div>
              ) : null}
              <div>
                <p className="text-xs text-muted-foreground">Body</p>
                <Textarea
                  readOnly
                  rows={8}
                  className="font-mono text-sm"
                  value={current.plainText || current.htmlBody || ""}
                />
              </div>
              {current.cta ? (
                <p className="text-sm">
                  <span className="text-muted-foreground">CTA: </span>
                  {current.cta}
                </p>
              ) : null}
              {onApplyVariant ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onApplyVariant(current)}
                >
                  Copy into editor fields
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Copy content into the template fields manually, then save as
                  draft. Active templates are not overwritten.
                </p>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
