import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DEFAULT_USER_AGENT } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Instellingen",
};

const defaults = [
  { label: "Requests per minuut", value: "20" },
  { label: "Vertraging tussen requests", value: "1500 ms" },
  { label: "Max. pagina’s per domein", value: "5" },
  { label: "Max. gelijktijdigheid", value: "2" },
  { label: "Request-time-out", value: "15000 ms" },
  { label: "Max. retries", value: "2" },
  { label: "Algemene e-mails prefereren", value: "Aan" },
  { label: "Persoonsgebonden e-mails", value: "Uit" },
  {
    label: "E-mail prefix denylist",
    value: "privacy, abuse, noreply, no-reply, example, test, webmaster",
  },
  { label: "User-agent", value: DEFAULT_USER_AGENT },
] as const;

export default function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Instellingen"
        description="Veilige standaardwaarden voor scrapinggedrag. Bewerkbare instellingen volgen later."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Instellingen" },
        ]}
      />
      <Card className="max-w-3xl shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Scrapinggedrag</CardTitle>
          <CardDescription>
            Deze defaults staan in de database (`organization_settings`) en
            worden bij organisatie-aanmaak toegepast. Live scraping volgt in een
            latere fase.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="divide-y divide-border">
            {defaults.map((item) => (
              <div
                key={item.label}
                className="grid gap-1 py-3 sm:grid-cols-[14rem_1fr] sm:gap-4"
              >
                <dt className="text-sm text-muted-foreground">{item.label}</dt>
                <dd className="text-sm font-medium break-all">{item.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
