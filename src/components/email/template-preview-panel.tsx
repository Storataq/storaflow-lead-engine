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
import type { EmailTemplateRow } from "@/lib/email/template/queries";

type LeadPreviewOption = {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  city: string | null;
  country: string | null;
  notes: string | null;
};

type TemplatePreviewPanelProps = {
  template: EmailTemplateRow;
  leads: LeadPreviewOption[];
};

export function TemplatePreviewPanel({
  template,
  leads,
}: TemplatePreviewPanelProps) {
  const [leadId, setLeadId] = useState(leads[0]?.id ?? "");

  const preview = useMemo(() => {
    const lead = leads.find((l) => l.id === leadId);
    const data = contextFromCrmLike({
      companyName: lead?.company_name ?? "Acme Storage BV",
      contactName: lead?.contact_name ?? "Alex Example",
      email: lead?.email ?? "alex@example.com",
      phone: lead?.phone,
      website: lead?.website ?? "https://example.com",
      industry: lead?.industry ?? "Hospitality",
      city: lead?.city ?? "Amsterdam",
      country: lead?.country ?? "NL",
      description: lead?.notes,
      ownerName: "Storaflow team",
      jobTitle: "Operations Manager",
    });

    return previewEmailTemplate({
      template: {
        subject: template.subject,
        previewText: template.preview_text,
        htmlBody: template.html_body,
        textBody: template.text_body,
        fallbacks: mapTemplateFallbacks(template.fallbacks_json),
      },
      data,
    });
  }, [template, leads, leadId]);

  return (
    <div className="space-y-4">
      <div className="max-w-sm space-y-1">
        <label htmlFor="preview-lead" className="text-xs text-muted-foreground">
          Preview with CRM lead
        </label>
        <select
          id="preview-lead"
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={leadId}
          onChange={(e) => setLeadId(e.target.value)}
        >
          {leads.length === 0 ? (
            <option value="">Sample data (no open leads)</option>
          ) : null}
          {leads.map((lead) => (
            <option key={lead.id} value={lead.id}>
              {lead.company_name}
              {lead.contact_name ? ` — ${lead.contact_name}` : ""}
            </option>
          ))}
        </select>
      </div>

      {preview.missingVariables.length > 0 || preview.warnings.length > 0 ? (
        <Alert>
          <AlertTitle>Preview notes</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
              {preview.missingVariables.map((v) => (
                <li key={v}>Missing variable data: {`{{${v}}}`}</li>
              ))}
              {preview.warnings.slice(0, 8).map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="shadow-none">
        <CardHeader>
          <CardDescription>Rendered subject</CardDescription>
          <CardTitle className="text-base">{preview.subject || "—"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Preview text</p>
            <p>{preview.previewText || "—"}</p>
          </div>
          <div className="flex flex-wrap gap-1">
            {preview.usedVariables.map((v) => (
              <Badge key={v} variant="secondary">
                {`{{${v}}}`}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Rendered email (HTML)</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="prose prose-sm max-w-none rounded-lg border bg-background p-4 dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: preview.htmlBody }}
          />
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Plain text</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap rounded-lg border bg-muted/20 p-3 text-sm">
            {preview.textBody || "—"}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
