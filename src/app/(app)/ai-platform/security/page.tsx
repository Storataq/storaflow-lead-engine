import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AI_PLATFORM_UI } from "@/ai/constants";
import { getAiOrgSettings } from "@/ai/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: AI_PLATFORM_UI.securityTitle };

export default async function AiSecurityPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  const settings = await getAiOrgSettings(context.organization.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={AI_PLATFORM_UI.securityTitle}
        description="Prompt injection, tool abuse, cross-tenant leakage, rate abuse, and PII controls."
      />
      <Card>
        <CardHeader>
          <CardTitle>Active controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Strict security scanning:{" "}
            <strong>{settings.security_strict ? "enabled" : "relaxed"}</strong>
          </p>
          <p>
            Rate limit:{" "}
            <strong>{settings.rate_limit_per_minute}/minute</strong> per user
          </p>
          <p>
            Approval mode: <strong>{settings.approval_mode}</strong>
          </p>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Input scan for injection / privilege escalation signals</li>
            <li>PII redaction heuristics before model calls</li>
            <li>Tool calling gated by agent permission map + schema validation</li>
            <li>Org-scoped RLS on all AI tables (no cross-tenant reads)</li>
            <li>Provider failover without escalating privileges</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
