import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AI_PLATFORM_UI, MEMORY_SCOPE_LABELS, type MemoryScope } from "@/ai/constants";
import { listAiMemory } from "@/ai/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { formatDateTime } from "@/lib/ui/format";

export const metadata: Metadata = { title: AI_PLATFORM_UI.memoryTitle };

export default async function AiMemoryPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  const entries = await listAiMemory(context.organization.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={AI_PLATFORM_UI.memoryTitle}
        description="Short-term, conversation, user, company, agent, workflow, shared, and long-term memory."
      />
      <Card>
        <CardHeader>
          <CardTitle>Memory entries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No memory entries.</p>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="rounded-md border px-3 py-2 text-sm">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    {MEMORY_SCOPE_LABELS[entry.memory_scope as MemoryScope] ??
                      entry.memory_scope}
                  </Badge>
                  <span className="text-muted-foreground">
                    score {entry.rank_score} · {formatDateTime(entry.created_at)}
                  </span>
                </div>
                <p>{entry.summary ?? entry.content.slice(0, 280)}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
