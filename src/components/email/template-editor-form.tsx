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
  EMAIL_TEMPLATE_CATEGORIES,
  EMAIL_TEMPLATE_CATEGORY_LABELS,
  EMAIL_TEMPLATE_STATUSES,
  EMAIL_TEMPLATE_STATUS_LABELS,
  SUGGESTED_TEMPLATE_TAGS,
} from "@/lib/email/template/constants";
import {
  createEmailTemplateAction,
  updateEmailTemplateAction,
  type TemplateActionResult,
} from "@/lib/email/template/actions";
import type {
  EmailTemplateFolderRow,
  EmailTemplateRow,
} from "@/lib/email/template/queries";
import { KNOWN_TEMPLATE_VARIABLES } from "@/lib/email/template/variables";
import { AIWritingPanel } from "@/components/email/ai-writing-panel";

type TemplateEditorFormProps = {
  mode: "create" | "edit";
  template?: EmailTemplateRow | null;
  folders: EmailTemplateFolderRow[];
};

const initialState: TemplateActionResult = {
  success: false,
  message: "",
};

export function TemplateEditorForm({
  mode,
  template,
  folders,
}: TemplateEditorFormProps) {
  const router = useRouter();
  const boundUpdate = updateEmailTemplateAction.bind(null, template!.id);

  async function formActionWithState(
    _prev: TemplateActionResult,
    formData: FormData,
  ): Promise<TemplateActionResult> {
    if (mode === "create") {
      return createEmailTemplateAction(formData);
    }
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
      if (state.warnings?.length) {
        toast.message(state.warnings.slice(0, 3).join(" · "));
      }
      if (state.id) {
        router.push(`/email/templates/${state.id}`);
        router.refresh();
      }
    } else {
      toast.error(state.message);
    }
  }, [state, router]);

  const fallbacksDefault = template?.fallbacks_json
    ? JSON.stringify(template.fallbacks_json, null, 2)
    : '{\n  "contactFirstName": "there"\n}';

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={template?.name ?? ""}
            placeholder="Cold outreach — hospitality"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="language">Language</Label>
          <Input
            id="language"
            name="language"
            defaultValue={template?.language ?? "en"}
            placeholder="en"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            rows={2}
            defaultValue={template?.description ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            name="category"
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            defaultValue={template?.category ?? "custom"}
          >
            {EMAIL_TEMPLATE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {EMAIL_TEMPLATE_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            defaultValue={template?.status ?? "draft"}
          >
            {EMAIL_TEMPLATE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {EMAIL_TEMPLATE_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="folder_id">Folder</Label>
          <select
            id="folder_id"
            name="folder_id"
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            defaultValue={template?.folder_id ?? ""}
          >
            <option value="">None</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tags">Tags (comma-separated)</Label>
          <Input
            id="tags"
            name="tags"
            defaultValue={(template?.tags ?? []).join(", ")}
            placeholder={SUGGESTED_TEMPLATE_TAGS.slice(0, 4).join(", ")}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">Subject</Label>
        <Input
          id="subject"
          name="subject"
          required
          defaultValue={template?.subject ?? ""}
          placeholder="{{companyName}} — quick intro"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="preview_text">Preview text</Label>
        <Input
          id="preview_text"
          name="preview_text"
          defaultValue={template?.preview_text ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="html_body">HTML body</Label>
        <Textarea
          id="html_body"
          name="html_body"
          required
          rows={12}
          className="font-mono text-sm"
          defaultValue={
            template?.html_body ??
            `<p>Hi {{contactFirstName}},</p>\n<p>I noticed {{companyName}} in {{industry}}…</p>\n<p>— {{ownerName}}</p>`
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="text_body">
          Plain text (optional — auto-generated if empty)
        </Label>
        <Textarea
          id="text_body"
          name="text_body"
          rows={6}
          className="font-mono text-sm"
          defaultValue={template?.text_body ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="fallbacks_json">Fallback values (JSON)</Label>
        <Textarea
          id="fallbacks_json"
          name="fallbacks_json"
          rows={5}
          className="font-mono text-sm"
          defaultValue={fallbacksDefault}
        />
      </div>
      {mode === "edit" ? (
        <div className="space-y-2">
          <Label htmlFor="change_notes">Change notes (for new version)</Label>
          <Input
            id="change_notes"
            name="change_notes"
            placeholder="Subject line tweak"
          />
        </div>
      ) : null}

      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Known variables
        </p>
        <div className="flex flex-wrap gap-1.5">
          {KNOWN_TEMPLATE_VARIABLES.map((v) => (
            <code
              key={v}
              className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-foreground"
            >
              {`{{${v}}}`}
            </code>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending
            ? "Saving…"
            : mode === "create"
              ? "Create template"
              : "Save template"}
        </Button>
        <Button
          type="button"
          variant="outline"
          nativeButton={false}
          render={
            <Link
              href={
                template ? `/email/templates/${template.id}` : "/email/templates"
              }
            />
          }
        >
          Cancel
        </Button>
      </div>

      <AIWritingPanel
        templateId={template?.id}
        initialSubject={template?.subject ?? ""}
        initialPreview={template?.preview_text ?? ""}
        initialBody={template?.html_body ?? template?.text_body ?? ""}
        onApplyVariant={(variant) => {
          const subject = document.getElementById(
            "subject",
          ) as HTMLInputElement | null;
          const preview = document.getElementById(
            "preview_text",
          ) as HTMLInputElement | null;
          const html = document.getElementById(
            "html_body",
          ) as HTMLTextAreaElement | null;
          const text = document.getElementById(
            "text_body",
          ) as HTMLTextAreaElement | null;
          if (variant.subject && subject) subject.value = variant.subject;
          if (variant.previewText && preview) preview.value = variant.previewText;
          if (variant.htmlBody && html) html.value = variant.htmlBody;
          if (variant.plainText && text) text.value = variant.plainText;
          else if (variant.plainText && html && !variant.htmlBody) {
            html.value = variant.plainText.split("\n").map((l) => `<p>${l}</p>`).join("\n");
          }
          toast.message("AI variant copied into the form. Review and save as draft.");
        }}
      />
    </form>
  );
}
