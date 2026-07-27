import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ContactBadgeList } from "@/components/crm/contact-badges";
import { ContactIntelligenceSection } from "@/components/crm/contact-intelligence-section";
import { CrmSubnav } from "@/components/crm/crm-subnav";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCrmLeadContact } from "@/lib/crm/contact-intelligence/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Contact ${id.slice(0, 8)}` };
}

export default async function ContactDetailPage({ params }: PageProps) {
  const { id } = await params;
  const context = await getActiveOrganization();
  if (!context) notFound();

  const contact = await getCrmLeadContact(context.organization.id, id).catch(
    () => null,
  );
  if (!contact) notFound();

  const name =
    `${contact.first_name} ${contact.last_name}`.trim() || "Naamloos contact";
  const canManage =
    context.membership.role === "owner" ||
    context.membership.role === "admin";

  return (
    <div>
      <PageHeader
        title={name}
        description="CRM contact detail with AI Contact Intelligence."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "CRM", href: "/crm" },
          { label: "Contact Intelligence", href: "/crm/contacts" },
          { label: name },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            {contact.lead ? (
              <Button
                nativeButton={false}
                variant="outline"
                render={<Link href={`/crm/leads/${contact.lead.id}`} />}
              >
                Open lead
              </Button>
            ) : null}
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/crm/contacts" />}
            >
              Back to contacts
            </Button>
          </div>
        }
      />
      <CrmSubnav currentPath="/crm/contacts" />

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Contact profile</CardTitle>
            <CardDescription>
              {contact.is_primary ? (
                <Badge variant="secondary">Primary</Badge>
              ) : (
                "CRM lead contact"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Title</span>
              <span>{contact.job_title ?? "—"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Email</span>
              <span>{contact.email ?? "—"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Phone</span>
              <span>{contact.phone ?? "—"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">LinkedIn</span>
              {contact.linkedin_url ? (
                <a
                  href={contact.linkedin_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-medium underline-offset-4 hover:underline"
                >
                  Profile
                </a>
              ) : (
                <span>—</span>
              )}
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Company / lead</span>
              <span>{contact.lead?.company_name ?? "—"}</span>
            </div>
            <ContactBadgeList
              className="pt-2"
              badges={
                Array.isArray(contact.badges_json)
                  ? (contact.badges_json as Array<{
                      code: string;
                      label?: string;
                    }>)
                  : []
              }
            />
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Scores at a glance</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3 text-center text-sm">
            <div>
              <p className="text-muted-foreground">Health</p>
              <p className="text-2xl font-semibold tabular-nums">
                {contact.health_score != null
                  ? Math.round(Number(contact.health_score))
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Quality</p>
              <p className="text-2xl font-semibold tabular-nums">
                {contact.quality_score != null
                  ? Math.round(Number(contact.quality_score))
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Confidence</p>
              <p className="text-2xl font-semibold tabular-nums">
                {contact.intelligence_confidence != null
                  ? `${Math.round(Number(contact.intelligence_confidence))}%`
                  : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <ContactIntelligenceSection
        organizationId={context.organization.id}
        contactId={contact.id}
        canManage={canManage}
        statusHint={contact.intelligence_status}
        badgesHint={contact.badges_json}
      />
    </div>
  );
}
