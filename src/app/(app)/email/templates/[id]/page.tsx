import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmailSubnav } from "@/components/email/email-subnav";
import {
  TemplateArchiveButton,
  TemplateDuplicateButton,
} from "@/components/email/template-action-buttons";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { validateTemplateContent } from "@/lib/email/template";
import {
  EMAIL_TEMPLATE_CATEGORY_LABELS,
  EMAIL_TEMPLATE_STATUS_LABELS,
  type EmailTemplateCategory,
  type EmailTemplateStatusExtended,
} from "@/lib/email/template/constants";
import {
  getEmailTemplate,
  listTemplateFolders,
} from "@/lib/email/template/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: "Template Detail" };

type PageProps = { params: Promise<{ id: string }> };

export default async function EmailTemplateDetailPage({ params }: PageProps) {
  const { id } = await params;
  const context = await getActiveOrganization();
  if (!context) return null;

  const [template, folders] = await Promise.all([
    getEmailTemplate(context.organization.id, id),
    listTemplateFolders(context.organization.id),
  ]);

  if (!template) notFound();

  const validation = validateTemplateContent({
    subject: template.subject,
    previewText: template.preview_text,
    htmlBody: template.html_body,
    textBody: template.text_body,
  });

  const folderName =
    folders.find((f) => f.id === template.folder_id)?.name ?? "—";
  const category =
    template.category && template.category in EMAIL_TEMPLATE_CATEGORY_LABELS
      ? EMAIL_TEMPLATE_CATEGORY_LABELS[
          template.category as EmailTemplateCategory
        ]
      : (template.category ?? "—");
  const status =
    template.status in EMAIL_TEMPLATE_STATUS_LABELS
      ? EMAIL_TEMPLATE_STATUS_LABELS[
          template.status as EmailTemplateStatusExtended
        ]
      : template.status;

  return (
    <div>
      <PageHeader
        title={template.name}
        description={template.description ?? "Email template detail"}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Email Engine", href: "/email" },
          { label: "Templates", href: "/email/templates" },
          { label: template.name },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              nativeButton={false}
              render={<Link href={`/email/templates/${id}/edit`} />}
            >
              Edit
            </Button>
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href={`/email/templates/${id}/preview`} />}
            >
              Preview
            </Button>
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href={`/email/templates/${id}/versions`} />}
            >
              Versions
            </Button>
            <TemplateDuplicateButton templateId={id} />
            {template.status !== "archived" ? (
              <TemplateArchiveButton templateId={id} />
            ) : null}
          </div>
        }
      />
      <EmailSubnav currentPath="/email/templates" />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Status</CardDescription>
            <CardTitle className="text-base">{status}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Category</CardDescription>
            <CardTitle className="text-base">{category}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Language / Version</CardDescription>
            <CardTitle className="text-base">
              {template.language} · v{template.version}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Folder</CardDescription>
            <CardTitle className="text-base">{folderName}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Subject</CardTitle>
            <CardDescription>{template.subject}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Preview text</p>
              <p>{template.preview_text || "—"}</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {(template.tags ?? []).map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
              {(template.variables ?? []).map((v) => (
                <Badge key={v} variant="secondary">
                  {`{{${v}}}`}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">HTML body</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/20 p-3 font-mono text-xs">
              {template.html_body}
            </pre>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Validation</CardTitle>
            <CardDescription>
              {validation.ok
                ? "Ready for future use"
                : "Fix errors before activate"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {validation.variableIssues.length === 0 &&
            validation.htmlIssues.length === 0 ? (
              <p className="text-sm text-muted-foreground">No issues found.</p>
            ) : (
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {[...validation.variableIssues, ...validation.htmlIssues].map(
                  (issue) => (
                    <li key={`${issue.code}-${issue.message}`}>
                      [{issue.severity}] {issue.message}
                    </li>
                  ),
                )}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
