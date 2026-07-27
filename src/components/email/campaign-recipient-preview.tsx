"use client";

import { useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  contextFromCrmLike,
  previewEmailTemplate,
} from "@/lib/email/template";
import { mapTemplateFallbacks } from "@/lib/email/template/fallbacks";
import type { EmailRecipientRow } from "@/lib/email/campaign/queries";
import type { Json } from "@/types/supabase";

type TemplateSnapshot = {
  subject: string;
  previewText: string | null;
  htmlBody: string;
  textBody: string | null;
  fallbacksJson?: Json;
};

type CampaignRecipientPreviewProps = {
  recipients: EmailRecipientRow[];
  template: TemplateSnapshot;
};

function personalizationFromJson(
  value: Json,
): Record<string, string | null | undefined> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = v == null ? null : String(v);
  }
  return out;
}

export function CampaignRecipientPreview({
  recipients,
  template,
}: CampaignRecipientPreviewProps) {
  const eligible = recipients.filter(
    (r) =>
      r.eligibility_status === "eligible" ||
      r.eligibility_status === "eligible_with_warning",
  );
  const pool = eligible.length ? eligible : recipients;
  const [recipientId, setRecipientId] = useState(pool[0]?.id ?? "");

  const preview = useMemo(() => {
    const recipient = pool.find((r) => r.id === recipientId) ?? pool[0];
    const personalization = personalizationFromJson(
      recipient?.personalization_json ?? {},
    );
    const data = contextFromCrmLike({
      companyName:
        personalization.companyName ?? recipient?.company_name ?? "Company",
      contactName: recipient?.preferred_name,
      email: recipient?.preferred_email,
      industry: personalization.industry,
      city: personalization.city,
      country: personalization.country,
      website: personalization.website,
      phone: personalization.phone,
      ownerName: personalization.ownerName ?? "our team",
      jobTitle: personalization.jobTitle,
      description: personalization.companyDescription,
    });

    return {
      recipient,
      rendered: previewEmailTemplate({
        template: {
          subject: template.subject,
          previewText: template.previewText,
          htmlBody: template.htmlBody,
          textBody: template.textBody,
          fallbacks: mapTemplateFallbacks(template.fallbacksJson ?? {}),
        },
        data: { ...data, ...personalization },
      }),
    };
  }, [pool, recipientId, template]);

  if (pool.length === 0) {
    return (
      <Alert>
        <AlertTitle>No recipients</AlertTitle>
        <AlertDescription>
          Build a recipient snapshot to preview personalization.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="max-w-md space-y-1">
        <label htmlFor="recipient-pick" className="text-xs text-muted-foreground">
          Sample recipient
        </label>
        <select
          id="recipient-pick"
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={recipientId}
          onChange={(e) => setRecipientId(e.target.value)}
        >
          {pool.slice(0, 50).map((r) => (
            <option key={r.id} value={r.id}>
              {r.company_name ?? "Company"} — {r.preferred_email} (
              {r.eligibility_status})
            </option>
          ))}
        </select>
      </div>

      {preview.rendered.warnings.length > 0 ? (
        <Alert>
          <AlertTitle>Personalization notes</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc pl-4 text-sm">
              {preview.rendered.warnings.slice(0, 8).map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="shadow-none">
        <CardHeader>
          <CardDescription>Rendered subject</CardDescription>
          <CardTitle className="text-base">{preview.rendered.subject}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            Preview: {preview.rendered.previewText || "—"}
          </p>
          <div className="flex flex-wrap gap-1">
            {preview.rendered.usedVariables.map((v) => (
              <Badge key={v} variant="secondary">
                {`{{${v}}}`}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Rendered HTML</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="prose prose-sm max-w-none rounded-lg border p-4 dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: preview.rendered.htmlBody }}
          />
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Plain text</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap rounded-lg border bg-muted/20 p-3 text-sm">
            {preview.rendered.textBody}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
