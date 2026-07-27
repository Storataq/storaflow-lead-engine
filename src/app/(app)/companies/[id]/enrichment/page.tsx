import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCompany } from "@/lib/companies/queries";
import {
  getLatestCompanyEnrichmentSnapshot,
  listCompanyContacts,
} from "@/lib/enrichment/queries";
import { COMPLIANCE_NOTICE } from "@/lib/enrichment/types";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { formatDateTime } from "@/lib/ui/format";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Enrichment results ${id.slice(0, 8)}` };
}

function str(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "—" : String(value);
}

export default async function CompanyEnrichmentResultsPage({
  params,
}: PageProps) {
  const { id } = await params;
  const context = await getActiveOrganization();
  if (!context) return null;

  const company = await getCompany(context.organization.id, id).catch(() => null);
  if (!company) notFound();

  const [snapshot, contacts] = await Promise.all([
    getLatestCompanyEnrichmentSnapshot(context.organization.id, company.id).catch(
      () => null,
    ),
    listCompanyContacts(context.organization.id, company.id).catch(() => []),
  ]);

  return (
    <div>
      <PageHeader
        title={`Enrichment — ${company.company_name}`}
        description="Ontdekte publieke contactpunten, bronpagina's en CRM-contacten."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Bedrijven", href: "/companies" },
          { label: company.company_name, href: `/companies/${company.id}` },
          { label: "Enrichment" },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href={`/companies/${company.id}`} />}
            >
              Terug naar bedrijf
            </Button>
            {snapshot?.jobId ? (
              <Button
                nativeButton={false}
                variant="outline"
                render={<Link href={`/jobs/${snapshot.jobId}`} />}
              >
                Bekijk job
              </Button>
            ) : null}
          </div>
        }
      />

      <p className="mb-4 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        {COMPLIANCE_NOTICE} Mailbox status blijft Unverified / Not Checked.
      </p>

      {!snapshot ? (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Nog geen resultaten</CardTitle>
            <CardDescription>
              Start website enrichment vanaf de bedrijfsdetailpagina.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-none">
              <CardHeader className="pb-2">
                <CardDescription>Availability</CardDescription>
                <CardTitle className="text-base">
                  {snapshot.availability ?? "—"}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="shadow-none">
              <CardHeader className="pb-2">
                <CardDescription>Emails</CardDescription>
                <CardTitle className="text-base tabular-nums">
                  {snapshot.emails}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="shadow-none">
              <CardHeader className="pb-2">
                <CardDescription>Phones</CardDescription>
                <CardTitle className="text-base tabular-nums">
                  {snapshot.phones}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="shadow-none">
              <CardHeader className="pb-2">
                <CardDescription>Laatste run</CardDescription>
                <CardTitle className="text-base">
                  {snapshot.discoveredAt
                    ? formatDateTime(snapshot.discoveredAt)
                    : "—"}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="flex flex-wrap gap-2">
            {snapshot.contactPage ? (
              <Badge variant="secondary">Contact page</Badge>
            ) : null}
            {snapshot.aboutPage ? (
              <Badge variant="secondary">About page</Badge>
            ) : null}
            {snapshot.teamPage ? (
              <Badge variant="secondary">Team page</Badge>
            ) : null}
            <Badge variant="outline">{snapshot.pages} pages</Badge>
            <Badge variant="outline">
              {snapshot.duplicatesPrevented} duplicates prevented
            </Badge>
          </div>

          {snapshot.warnings.length > 0 ? (
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Warnings</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {snapshot.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Emails</CardTitle>
              <CardDescription>
                Syntax/domain checks only — mailbox not verified.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {snapshot.emailPreview.length === 0 ? (
                <p className="text-sm text-muted-foreground">Geen e-mails gevonden.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Syntax</TableHead>
                      <TableHead>Domain</TableHead>
                      <TableHead>Mailbox</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {snapshot.emailPreview.map((row) => (
                      <TableRow key={str(row.email)}>
                        <TableCell className="font-medium">{str(row.email)}</TableCell>
                        <TableCell>{str(row.category)}</TableCell>
                        <TableCell>{str(row.syntaxStatus)}</TableCell>
                        <TableCell>{str(row.domainStatus)}</TableCell>
                        <TableCell>{str(row.mailboxStatus)}</TableCell>
                        <TableCell className="tabular-nums">
                          {str(row.confidence)} ({str(row.confidenceClass)})
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate text-xs">
                          {str(row.sourceUrl)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Phones</CardTitle>
            </CardHeader>
            <CardContent>
              {snapshot.phonePreview.length === 0 ? (
                <p className="text-sm text-muted-foreground">Geen telefoons gevonden.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Original</TableHead>
                      <TableHead>Normalized</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {snapshot.phonePreview.map((row) => (
                      <TableRow key={str(row.normalized)}>
                        <TableCell>{str(row.original)}</TableCell>
                        <TableCell>{str(row.normalized)}</TableCell>
                        <TableCell>{str(row.category)}</TableCell>
                        <TableCell className="tabular-nums">
                          {str(row.confidence)}
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate text-xs">
                          {str(row.sourceUrl)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Social profiles</CardTitle>
            </CardHeader>
            <CardContent>
              {snapshot.socialPreview.length === 0 ? (
                <p className="text-sm text-muted-foreground">Geen social links.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {snapshot.socialPreview.map((row) => (
                    <li
                      key={`${str(row.platform)}-${str(row.url)}`}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <Badge variant="outline">{str(row.platform)}</Badge>
                      <a
                        href={str(row.url)}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="truncate underline-offset-4 hover:underline"
                      >
                        {str(row.url)}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Possible contacts</CardTitle>
              <CardDescription>
                Low-confidence names remain Needs Review — not auto-CRM people.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {snapshot.peoplePreview.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Geen named contacts geëxtraheerd.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Review</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {snapshot.peoplePreview.map((row) => (
                      <TableRow key={`${str(row.fullName)}-${str(row.sourceUrl)}`}>
                        <TableCell>{str(row.fullName)}</TableCell>
                        <TableCell>{str(row.jobTitle)}</TableCell>
                        <TableCell>{str(row.email)}</TableCell>
                        <TableCell>{str(row.phone)}</TableCell>
                        <TableCell className="tabular-nums">
                          {str(row.confidence)}
                        </TableCell>
                        <TableCell>{str(row.reviewStatus)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Pages</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshot.pagePreview.map((row) => (
                    <TableRow key={str(row.url)}>
                      <TableCell>
                        <Badge variant="outline">{str(row.pageType)}</Badge>
                      </TableCell>
                      <TableCell>{str(row.title)}</TableCell>
                      <TableCell className="max-w-[240px] truncate text-xs">
                        {str(row.url)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {str(row.confidence)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">CRM contacts table</CardTitle>
              <CardDescription>
                Persisted company contact points (emails/phones).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nog geen contacts-rijen voor dit bedrijf.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead>Verification</TableHead>
                      <TableHead>Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell>{contact.contact_type}</TableCell>
                        <TableCell className="font-medium">
                          {contact.contact_value}
                        </TableCell>
                        <TableCell>{contact.label ?? "—"}</TableCell>
                        <TableCell>{contact.verification_status}</TableCell>
                        <TableCell className="max-w-[180px] truncate text-xs">
                          {contact.source_url ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
