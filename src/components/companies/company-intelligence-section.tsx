import { Suspense } from "react";

import { CompanyIntelligencePanel } from "@/components/companies/company-intelligence-panel";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCompanyIntelligenceProfile } from "@/lib/companies/intelligence/queries";

type Props = {
  organizationId: string;
  companyId: string;
  canManage: boolean;
  companyStatusHint?: string | null;
};

function IntelligenceSkeleton() {
  return (
    <Card className="shadow-none" aria-busy="true">
      <CardHeader>
        <CardTitle className="text-base">Company Intelligence</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Loading intelligence…</p>
      </CardContent>
    </Card>
  );
}

async function CompanyIntelligenceLoader(props: Props) {
  const profile = await getCompanyIntelligenceProfile(
    props.organizationId,
    props.companyId,
  ).catch(() => null);

  return (
    <CompanyIntelligencePanel
      companyId={props.companyId}
      profile={profile}
      canManage={props.canManage}
      companyStatusHint={props.companyStatusHint}
    />
  );
}

/** Lazy-loaded via Suspense so company detail shell paints first. */
export function CompanyIntelligenceSection(props: Props) {
  return (
    <Suspense fallback={<IntelligenceSkeleton />}>
      <CompanyIntelligenceLoader {...props} />
    </Suspense>
  );
}
