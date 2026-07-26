import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type JobDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: JobDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Taak ${id.slice(0, 8)}` };
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const { id } = await params;

  return (
    <div>
      <PageHeader
        title="Scrapingtaak"
        description="Voortgang, fouten en resultaten van een scrape-job."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Scrapingtaken", href: "/jobs" },
          { label: id.slice(0, 8) },
        ]}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {["Verwerkt", "Succesvol", "Overgeslagen", "Mislukt"].map((label) => (
          <Card key={label} className="shadow-none">
            <CardHeader className="pb-2">
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-2xl">—</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
      <Card className="mt-4 border-dashed shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Nog geen jobdata</CardTitle>
          <CardDescription>
            Fouttypes, voortgang en URL-fouten verschijnen hier na de workerfase.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          ID: <code>{id}</code>
        </CardContent>
      </Card>
    </div>
  );
}
