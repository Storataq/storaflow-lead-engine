import type { Metadata } from "next";

import { CreatePromptForm } from "@/components/ai-platform/create-prompt-form";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AI_PLATFORM_UI } from "@/ai/constants";
import { listAiPrompts } from "@/ai/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: AI_PLATFORM_UI.promptsTitle };

export default async function AiPromptsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  const prompts = await listAiPrompts(context.organization.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={AI_PLATFORM_UI.promptsTitle}
        description="Versioned templates with variables, locale, inheritance, and A/B variants."
      />
      <Card>
        <CardHeader>
          <CardTitle>New prompt version</CardTitle>
          <CardDescription>Each save increments version for the slug.</CardDescription>
        </CardHeader>
        <CardContent>
          <CreatePromptForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Templates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {prompts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No prompts yet.</p>
          ) : (
            prompts.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {p.name}{" "}
                    <span className="text-muted-foreground">({p.slug})</span>
                  </p>
                  <p className="text-muted-foreground">
                    {p.category} · {p.locale}
                    {p.parent_slug ? ` · inherits ${p.parent_slug}` : ""}
                    {p.ab_variant ? ` · variant ${p.ab_variant}` : ""}
                  </p>
                </div>
                <Badge variant="outline">v{p.version}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
