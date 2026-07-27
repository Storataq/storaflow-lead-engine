import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AI_PLATFORM_UI, AI_PROVIDER_LABELS, type AiProviderCode } from "@/ai/constants";
import { getProviderStatusMap } from "@/ai/providers/router";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: AI_PLATFORM_UI.providersTitle };

export default async function AiProvidersPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  const status = getProviderStatusMap();

  return (
    <div className="space-y-6">
      <PageHeader
        title={AI_PLATFORM_UI.providersTitle}
        description="Multi-provider model router with automatic failover (OpenAI → Anthropic → Gemini)."
      />
      <Card>
        <CardHeader>
          <CardTitle>Providers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Object.entries(status).map(([code, row]) => (
            <div
              key={code}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">
                  {AI_PROVIDER_LABELS[code as AiProviderCode] ?? row.label}
                </p>
                <p className="text-muted-foreground">
                  {code === "openai" && "OPENAI_API_KEY"}
                  {code === "anthropic" && "ANTHROPIC_API_KEY"}
                  {code === "gemini" && "GOOGLE_AI_API_KEY / GEMINI_API_KEY"}
                  {!["openai", "anthropic", "gemini"].includes(code) &&
                    "Adapter reserved / extend router"}
                </p>
              </div>
              <Badge variant={row.configured ? "default" : "secondary"}>
                {row.configured ? "Configured" : "Not configured"}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
