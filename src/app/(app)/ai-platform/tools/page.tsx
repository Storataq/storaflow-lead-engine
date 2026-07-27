import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AI_PLATFORM_UI } from "@/ai/constants";
import { listAiTools } from "@/ai/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: AI_PLATFORM_UI.toolsTitle };

export default async function AiToolsPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  const tools = await listAiTools(context.organization.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={AI_PLATFORM_UI.toolsTitle}
        description="Universal tool registry with schemas, permissions, timeouts, and retries."
      />
      <Card>
        <CardHeader>
          <CardTitle>Registered tools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {tools.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tools found. Apply migration 00042 to seed system tools.
            </p>
          ) : (
            tools.map((tool) => (
              <div
                key={tool.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {tool.name}{" "}
                    <span className="text-muted-foreground">({tool.tool_key})</span>
                  </p>
                  <p className="text-muted-foreground">
                    v{tool.version} · timeout {tool.timeout_ms}ms · retries{" "}
                    {tool.retry_count}
                    {tool.is_system ? " · system" : ""}
                  </p>
                  <p className="text-muted-foreground">{tool.description}</p>
                </div>
                <Badge variant={tool.is_active ? "default" : "secondary"}>
                  {tool.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
