import Link from "next/link";

import { ContactBadgeList } from "@/components/crm/contact-badges";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CrmLeadContactWithIntelligence } from "@/lib/crm/contact-intelligence/queries";

function contactName(c: CrmLeadContactWithIntelligence): string {
  return `${c.first_name} ${c.last_name}`.trim() || "Naamloos";
}

function ContactWidgetList({
  title,
  description,
  contacts,
}: {
  title: string;
  description: string;
  contacts: CrmLeadContactWithIntelligence[];
}) {
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Geen resultaten.</p>
        ) : (
          <ul className="space-y-2">
            {contacts.map((contact) => (
              <li key={contact.id}>
                <Link
                  href={`/crm/contacts/${contact.id}`}
                  className="block rounded-lg border border-border px-3 py-2 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{contactName(contact)}</p>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      Q {contact.quality_score != null
                        ? Math.round(Number(contact.quality_score))
                        : "—"}{" "}
                      · H{" "}
                      {contact.health_score != null
                        ? Math.round(Number(contact.health_score))
                        : "—"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {contact.job_title ?? "Geen titel"}
                    {contact.lead?.company_name
                      ? ` · ${contact.lead.company_name}`
                      : ""}
                  </p>
                  <ContactBadgeList
                    className="mt-1.5"
                    badges={
                      Array.isArray(contact.badges_json)
                        ? (contact.badges_json as Array<{
                            code: string;
                            label?: string;
                          }>)
                        : []
                    }
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function ContactIntelligenceDashboardWidgets({
  topContacts,
  recentlyActive,
  bestDecisionMakers,
  highestScores,
  missingInformation,
  hotLeads,
}: {
  topContacts: CrmLeadContactWithIntelligence[];
  recentlyActive: CrmLeadContactWithIntelligence[];
  bestDecisionMakers: CrmLeadContactWithIntelligence[];
  highestScores: CrmLeadContactWithIntelligence[];
  missingInformation: CrmLeadContactWithIntelligence[];
  hotLeads: CrmLeadContactWithIntelligence[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <ContactWidgetList
        title="Top Contacts"
        description="Highest contact quality scores"
        contacts={topContacts}
      />
      <ContactWidgetList
        title="Recently Active"
        description="Recently updated contacts"
        contacts={recentlyActive}
      />
      <ContactWidgetList
        title="Best Decision Makers"
        description="Flagged decision makers by quality"
        contacts={bestDecisionMakers}
      />
      <ContactWidgetList
        title="Highest Contact Scores"
        description="Best health scores"
        contacts={highestScores}
      />
      <ContactWidgetList
        title="Contacts Missing Information"
        description="Missing email, phone, or title"
        contacts={missingInformation}
      />
      <ContactWidgetList
        title="Hot Leads"
        description="Contacts with Hot Lead badge"
        contacts={hotLeads}
      />
    </div>
  );
}
