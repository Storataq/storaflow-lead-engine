import type { Metadata } from "next";
import Link from "next/link";
import { Radar, Sparkles } from "lucide-react";

import { CrmSubnav } from "@/components/crm/crm-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Company Intelligence",
};

export default function CompanyIntelligencePage() {
  return (
    <div>
      <PageHeader
        title="Company Intelligence"
        description="Hub voor enrichment sources en toekomstige connectors. Nog geen live API's."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "CRM", href: "/crm" },
          { label: "Company Intelligence" },
        ]}
      />
      <CrmSubnav currentPath="/crm/intelligence" />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Radar className="size-4 text-muted-foreground" />
              Sources
            </CardTitle>
            <CardDescription>
              Catalogus van mock intelligence sources, health, pipeline en
              toekomstige connector-interfaces.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              nativeButton={false}
              render={<Link href="/crm/intelligence/sources" />}
            >
              Open Sources Center
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-muted-foreground" />
              Lead Enrichment
            </CardTitle>
            <CardDescription>
              Live enrichment blijft op de lead workspace (Intelligence-tab).
              Deze hub bereidt connectors voor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/crm/leads" />}
            >
              Naar Leads
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
