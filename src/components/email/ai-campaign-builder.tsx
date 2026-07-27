"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { AiSubjectOptimizer } from "@/components/email/ai-subject-optimizer";
import { CampaignWorkflowCanvas } from "@/components/email/campaign-workflow-canvas";
import { MultiDeviceEmailPreview } from "@/components/email/multi-device-email-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AUTOMATION_TRIGGERS,
  MERGE_FIELDS,
  WAIT_UNITS,
} from "@/lib/email/campaign-builder/constants";
import {
  createAbTestAction,
  createAiBuilderCampaignAction,
} from "@/lib/email/campaign-builder/actions";
import {
  EMAIL_CAMPAIGN_TYPE_LABELS,
  EMAIL_CAMPAIGN_TYPES,
} from "@/lib/email/campaign/constants";
import { generateEmailAIAction } from "@/lib/email/ai/actions";
import type { WorkflowGraph } from "@/lib/email/campaign-builder/types";
import type { CampaignRecommendation } from "@/lib/email/campaign-builder/types";
import type { EmailCampaignRow } from "@/lib/email/campaign/queries";

type AiCampaignBuilderProps = {
  campaign?: EmailCampaignRow | null;
  initialGraph: WorkflowGraph;
  recommendations?: CampaignRecommendation[];
};

export function AiCampaignBuilder({
  campaign,
  initialGraph,
  recommendations = [],
}: AiCampaignBuilderProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(campaign?.name ?? "");
  const [type, setType] = useState(campaign?.campaign_type ?? "cold_outreach");
  const [purpose, setPurpose] = useState(campaign?.objective ?? "");
  const [audience, setAudience] = useState("");
  const [offer, setOffer] = useState("");
  const [cta, setCta] = useState("");
  const [tone, setTone] = useState("professional");
  const [language, setLanguage] = useState(campaign?.language ?? "en");
  const [timezone, setTimezone] = useState(campaign?.timezone ?? "Europe/Amsterdam");
  const [scheduledFor, setScheduledFor] = useState(
    campaign?.scheduled_for?.slice(0, 16) ?? "",
  );
  const [tags, setTags] = useState((campaign?.tags ?? []).join(", "));
  const [generated, setGenerated] = useState<{
    subject?: string;
    preview?: string;
    body?: string;
    cta?: string;
  }>({
    subject: campaign?.template_subject_snapshot ?? undefined,
    preview: campaign?.template_preview_snapshot ?? undefined,
    body: campaign?.template_html_snapshot ?? undefined,
  });
  const [abA, setAbA] = useState("");
  const [abB, setAbB] = useState("");
  const [abDimension, setAbDimension] = useState("subject");

  function saveCampaign() {
    startTransition(async () => {
      const fd = new FormData();
      if (campaign?.id) fd.set("campaignId", campaign.id);
      fd.set("name", name || "AI Campaign");
      fd.set("campaignType", type);
      fd.set("purpose", purpose);
      fd.set("audience", audience);
      fd.set("offer", offer);
      fd.set("cta", cta);
      fd.set("tone", tone);
      fd.set("language", language);
      fd.set("timezone", timezone);
      if (scheduledFor) fd.set("scheduledFor", new Date(scheduledFor).toISOString());
      fd.set("tags", tags);
      const result = await createAiBuilderCampaignAction(fd);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      if (result.id) {
        router.push(`/email/campaigns/${result.id}/builder`);
        router.refresh();
      }
    });
  }

  function generateEmail() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("generationType", "follow_up_email");
      fd.set("tone", tone);
      fd.set("language", language);
      fd.set("campaignPurpose", purpose);
      fd.set("audienceSummary", audience);
      fd.set("offer", offer);
      fd.set("callToAction", cta);
      if (campaign?.id) fd.set("campaignId", campaign.id);
      const result = await generateEmailAIAction(fd);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      const variant = Array.isArray(result.variants)
        ? (result.variants[0] as Record<string, unknown> | undefined)
        : undefined;
      setGenerated({
        subject: typeof variant?.subject === "string" ? variant.subject : undefined,
        preview:
          typeof variant?.previewText === "string" ? variant.previewText : undefined,
        body:
          typeof variant?.htmlBody === "string"
            ? variant.htmlBody
            : typeof variant?.plainText === "string"
              ? variant.plainText
              : undefined,
        cta: typeof variant?.cta === "string" ? variant.cta : cta,
      });
      toast.success(result.message);
    });
  }

  function createAb() {
    if (!campaign?.id) {
      toast.error("Save the campaign first.");
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("campaignId", campaign.id);
      fd.set("name", `${name || "Campaign"} A/B`);
      fd.set("dimension", abDimension);
      fd.set("variantA", abA || generated.subject || "Variant A");
      fd.set("variantB", abB || "Variant B");
      const result = await createAbTestAction(fd);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Campaign brief</CardTitle>
            <CardDescription>
              AI builder mode — classic wizard remains available.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="ai-name">Name</Label>
              <Input id="ai-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ai-type">Campaign type</Label>
              <select
                id="ai-type"
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {EMAIL_CAMPAIGN_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {EMAIL_CAMPAIGN_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="ai-purpose">Purpose</Label>
              <Textarea
                id="ai-purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="ai-audience">Audience</Label>
              <Textarea
                id="ai-audience"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                rows={2}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="ai-offer">Offer</Label>
                <Input id="ai-offer" value={offer} onChange={(e) => setOffer(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="ai-cta">CTA</Label>
                <Input id="ai-cta" value={cta} onChange={(e) => setCta(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="ai-tone">Tone</Label>
                <Input id="ai-tone" value={tone} onChange={(e) => setTone(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="ai-lang">Language</Label>
                <Input
                  id="ai-lang"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ai-tz">Timezone</Label>
                <Input
                  id="ai-tz"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="ai-sched">Scheduled for</Label>
                <Input
                  id="ai-sched"
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ai-tags">Tags</Label>
                <Input
                  id="ai-tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="sales, nurture"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={saveCampaign} disabled={pending}>
                {pending ? "Saving…" : campaign ? "Update campaign" : "Create campaign"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={generateEmail}
                disabled={pending}
              >
                Generate email with AI
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Personalization & automation</CardTitle>
            <CardDescription>
              Merge fields, wait units, and condition triggers for the workflow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Merge fields
              </p>
              <div className="flex flex-wrap gap-2">
                {MERGE_FIELDS.map((f) => (
                  <Badge key={f.key} variant="outline">
                    {f.token}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Wait units
              </p>
              <div className="flex flex-wrap gap-2">
                {WAIT_UNITS.map((u) => (
                  <Badge key={u.value} variant="secondary">
                    {u.label}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Automation rules
              </p>
              <ul className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                {AUTOMATION_TRIGGERS.map((t) => (
                  <li key={t.id}>• {t.label}</li>
                ))}
              </ul>
            </div>
            {recommendations.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  AI recommendations
                </p>
                <ul className="space-y-2">
                  {recommendations.map((r) => (
                    <li key={r.id} className="rounded-lg border p-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{r.action}</span>
                        <Badge variant="outline">{r.priority}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{r.rationale}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {campaign?.id ? (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Visual workflow</CardTitle>
            <CardDescription>
              Drag & drop blocks with zoom and pan. Blocks: Start, Send Email, Wait,
              Delay, Condition, Decision, Split, Goal, Exit, End.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CampaignWorkflowCanvas
              campaignId={campaign.id}
              initialGraph={initialGraph}
            />
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">
          Save the campaign to unlock the visual workflow canvas.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <AiSubjectOptimizer
          campaignId={campaign?.id}
          defaultPurpose={purpose}
          defaultOffer={offer}
        />
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">A/B testing</CardTitle>
            <CardDescription>
              Draft tests for subject, content, CTA, sender name, or send time.
              Winner tracking hooks into enrollments later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="ab-dim">Dimension</Label>
              <select
                id="ab-dim"
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                value={abDimension}
                onChange={(e) => setAbDimension(e.target.value)}
              >
                <option value="subject">Subject</option>
                <option value="content">Content</option>
                <option value="cta">CTA</option>
                <option value="sender_name">Sender name</option>
                <option value="send_time">Send time</option>
              </select>
            </div>
            <div>
              <Label htmlFor="ab-a">Variant A</Label>
              <Textarea
                id="ab-a"
                value={abA}
                onChange={(e) => setAbA(e.target.value)}
                rows={2}
                placeholder={generated.subject || "Control"}
              />
            </div>
            <div>
              <Label htmlFor="ab-b">Variant B</Label>
              <Textarea
                id="ab-b"
                value={abB}
                onChange={(e) => setAbB(e.target.value)}
                rows={2}
              />
            </div>
            <Button type="button" onClick={createAb} disabled={pending || !campaign?.id}>
              Create A/B draft
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Email preview</CardTitle>
          <CardDescription>
            Desktop, tablet, mobile, and dark mode previews. Compliance footer and
            unsubscribe remain enforced by the preferences module at send time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MultiDeviceEmailPreview
            subject={generated.subject}
            previewText={generated.preview}
            html={generated.body}
          />
        </CardContent>
      </Card>
    </div>
  );
}
