import type { Metadata } from "next";
import Link from "next/link";

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
import { QUICK_ACTIONS, STARTER_PROMPTS } from "@/lib/copilot/constants";
import { buildCopilotDashboard } from "@/lib/copilot/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { toUserFacingError } from "@/lib/ui/user-facing-error";
import { PageErrorState } from "@/components/layout/page-error-state";

export const metadata: Metadata = { title: "AI Copilot" };

export default async function CopilotDashboardPage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  let errorMessage: string | null = null;
  let dashboard: Awaited<ReturnType<typeof buildCopilotDashboard>> | null =
    null;

  try {
    dashboard = await buildCopilotDashboard(
      context.organization.id,
      context.membership.user_id,
    );
  } catch (error) {
    errorMessage = toUserFacingError(
      error,
      "Could not load Copilot dashboard. Apply migration 20260726000033_ai_copilot.sql if needed.",
    );
  }

  if (errorMessage || !dashboard) {
    return (
      <div>
        <PageHeader
          title="AI Copilot"
          description="Platform assistant for search, insights, and confirmed actions."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "AI Copilot" },
          ]}
        />
        <PageErrorState
          title="Copilot"
          description={errorMessage ?? "Unavailable"}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="AI Copilot"
        description="Ask anything across CRM, campaigns, scoring, and automations. Writes always need confirmation."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "AI Copilot" },
        ]}
        actions={
          <Button nativeButton={false} render={<Link href="/settings/ai" />}>
            AI settings
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="shadow-none lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent conversations</CardTitle>
            <CardDescription>
              Pinned and favorite threads stay on top after migration is applied
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {dashboard.conversations.length === 0 ? (
              <p className="text-muted-foreground">
                No conversations yet. Open the floating Copilot (bottom-right)
                to start.
              </p>
            ) : (
              dashboard.conversations.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-2 rounded-lg border p-2"
                >
                  <span className="truncate font-medium">{c.title}</span>
                  <div className="flex gap-1">
                    {c.is_pinned ? <Badge variant="outline">Pinned</Badge> : null}
                    {c.is_favorite ? (
                      <Badge variant="secondary">Favorite</Badge>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((a) => (
              <Badge key={a.id} variant="outline">
                {a.label}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Starter prompts</CardTitle>
            <CardDescription>Frequently useful asks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {STARTER_PROMPTS.map((p) => (
              <div key={p.code} className="rounded-lg border p-2">
                <p className="font-medium">{p.title}</p>
                <p className="text-xs text-muted-foreground">{p.prompt}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Safety & providers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Read-only questions run immediately via org-scoped tools. Any
              data-changing proposal requires an explicit confirm step.
            </p>
            <p>
              LLM enrichment reuses the Phase 21K provider (`createAIProvider`)
              when `EMAIL_AI_ENABLED=true` and `OPENAI_API_KEY` is set.
              Architecture is ready for Anthropic, Google, and local LLMs.
            </p>
            <p>
              Voice input/output hooks are reserved (`FUTURE_VOICE_CAPABILITIES`).
            </p>
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/crm/executive" />}
            >
              Open Executive Analytics
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
