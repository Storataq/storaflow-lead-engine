import type { Metadata } from "next";
import { Suspense } from "react";

import { ContactIntelligenceDashboardWidgets } from "@/components/crm/contact-intelligence-dashboard-widgets";
import { ContactsIntelligenceFilters } from "@/components/crm/contacts-intelligence-filters";
import { CrmSubnav } from "@/components/crm/crm-subnav";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PreferredChannel } from "@/lib/crm/contact-intelligence/constants";
import {
  getContactIntelligenceDashboard,
  listIntelligentContacts,
} from "@/lib/crm/contact-intelligence/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Contact Intelligence",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export default async function ContactIntelligencePage({
  searchParams,
}: PageProps) {
  const context = await getActiveOrganization();
  if (!context) notFound();

  const params = await searchParams;
  const filters = {
    q: first(params.q),
    department: first(params.department),
    managementLevel: first(params.managementLevel),
    country: first(params.country),
    language: first(params.language),
    preferredChannel: first(params.preferredChannel) as
      | PreferredChannel
      | undefined,
    minHealthScore: parseNumber(first(params.minHealthScore)),
    minQualityScore: parseNumber(first(params.minQualityScore)),
    minConfidence: parseNumber(first(params.minConfidence)),
    decisionMaker: first(params.decisionMaker) === "1" ? true : undefined,
  };

  const [contacts, dashboard] = await Promise.all([
    listIntelligentContacts(context.organization.id, filters).catch(() => []),
    getContactIntelligenceDashboard(context.organization.id).catch(() => ({
      topContacts: [],
      recentlyActive: [],
      bestDecisionMakers: [],
      highestScores: [],
      missingInformation: [],
      hotLeads: [],
    })),
  ]);

  return (
    <div>
      <PageHeader
        title="Contact Intelligence"
        description="AI contact profiles, scores, decision makers, and outreach recommendations."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "CRM", href: "/crm" },
          { label: "Contact Intelligence" },
        ]}
      />
      <CrmSubnav currentPath="/crm/contacts" />

      <div className="mb-6 space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Dashboard widgets
        </h2>
        <ContactIntelligenceDashboardWidgets {...dashboard} />
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">All contacts</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense
            fallback={
              <p className="text-sm text-muted-foreground">Loading filters…</p>
            }
          >
            <ContactsIntelligenceFilters contacts={contacts} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
