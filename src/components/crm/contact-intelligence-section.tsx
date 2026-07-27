import { Suspense } from "react";

import { ContactIntelligencePanel } from "@/components/crm/contact-intelligence-panel";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getContactIntelligenceProfile } from "@/lib/crm/contact-intelligence/queries";

type Props = {
  organizationId: string;
  contactId: string;
  canManage: boolean;
  statusHint?: string | null;
  badgesHint?: unknown;
};

function Skeleton() {
  return (
    <Card className="shadow-none" aria-busy="true">
      <CardHeader>
        <CardTitle className="text-base">Contact Intelligence</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Loading intelligence…</p>
      </CardContent>
    </Card>
  );
}

async function Loader(props: Props) {
  const profile = await getContactIntelligenceProfile(
    props.organizationId,
    props.contactId,
  ).catch(() => null);

  return (
    <ContactIntelligencePanel
      contactId={props.contactId}
      profile={profile}
      canManage={props.canManage}
      statusHint={props.statusHint}
      badgesHint={props.badgesHint}
    />
  );
}

export function ContactIntelligenceSection(props: Props) {
  return (
    <Suspense fallback={<Skeleton />}>
      <Loader {...props} />
    </Suspense>
  );
}
