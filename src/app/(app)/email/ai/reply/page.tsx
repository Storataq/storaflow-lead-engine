import type { Metadata } from "next";

import { AIReplyAssistantPanel } from "@/components/email/ai-reply-assistant-panel";
import { EmailSubnav } from "@/components/email/email-subnav";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "AI Reply Assistant" };

export default function EmailAIReplyPage() {
  return (
    <div>
      <PageHeader
        title="AI reply assistant"
        description="Classify replies and draft responses for human review. AI never sends automatically."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Email Engine", href: "/email" },
          { label: "AI History", href: "/email/ai/history" },
          { label: "Reply assistant" },
        ]}
      />
      <EmailSubnav currentPath="/email/ai/history" />
      <AIReplyAssistantPanel />
    </div>
  );
}
