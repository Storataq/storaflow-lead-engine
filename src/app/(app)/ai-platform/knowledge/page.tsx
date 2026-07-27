import type { Metadata } from "next";

import { CreateKnowledgeForm } from "@/components/ai-platform/create-knowledge-form";
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
import { listAiKnowledge } from "@/ai/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: AI_PLATFORM_UI.knowledgeTitle };

export default async function AiKnowledgePage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  const docs = await listAiKnowledge(context.organization.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={AI_PLATFORM_UI.knowledgeTitle}
        description="RAG-ready knowledge corpus (lexical ranking; embedding_json reserved for vectors)."
      />
      <Card>
        <CardHeader>
          <CardTitle>Add document</CardTitle>
          <CardDescription>FAQ, playbooks, policies, CRM-derived notes.</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateKnowledgeForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Knowledge documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents yet.</p>
          ) : (
            docs.map((doc) => (
              <div key={doc.id} className="rounded-md border px-3 py-2 text-sm">
                <div className="mb-1 flex items-center gap-2">
                  <p className="font-medium">{doc.title}</p>
                  <Badge variant="outline">{doc.source_type}</Badge>
                </div>
                <p className="text-muted-foreground">{doc.body.slice(0, 240)}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
