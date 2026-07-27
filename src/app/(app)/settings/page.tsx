import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  APP_COPYRIGHT,
  APP_DESCRIPTION,
  APP_NAME,
  APP_TAGLINE,
  APP_VERSION,
  DEFAULT_USER_AGENT,
} from "@/lib/constants";

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
  const environment =
    process.env.NODE_ENV === "production" ? "Production" : "Development";

  return (
    <div>
      <PageHeader
        title="Instellingen"
        description="Productinformatie en veilige standaardwaarden voor scrapinggedrag."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Instellingen" },
        ]}
      />
      <div className="grid max-w-3xl gap-4">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Application</CardTitle>
            <CardDescription>{APP_DESCRIPTION}</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-border">
              <div className="grid gap-1 py-3 sm:grid-cols-[14rem_1fr] sm:gap-4">
                <dt className="text-sm text-muted-foreground">Product name</dt>
                <dd className="text-sm font-medium">{APP_NAME}</dd>
              </div>
              <div className="grid gap-1 py-3 sm:grid-cols-[14rem_1fr] sm:gap-4">
                <dt className="text-sm text-muted-foreground">Tagline</dt>
                <dd className="text-sm font-medium">{APP_TAGLINE}</dd>
              </div>
              <div className="grid gap-1 py-3 sm:grid-cols-[14rem_1fr] sm:gap-4">
                <dt className="text-sm text-muted-foreground">Version</dt>
                <dd className="text-sm font-medium">{APP_VERSION}</dd>
              </div>
              <div className="grid gap-1 py-3 sm:grid-cols-[14rem_1fr] sm:gap-4">
                <dt className="text-sm text-muted-foreground">Environment</dt>
                <dd className="text-sm font-medium">{environment}</dd>
              </div>
              <div className="grid gap-1 py-3 sm:grid-cols-[14rem_1fr] sm:gap-4">
                <dt className="text-sm text-muted-foreground">Copyright</dt>
                <dd className="text-sm font-medium">{APP_COPYRIGHT}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Company Categories</CardTitle>
            <CardDescription>
              Beheer bedrijfscategorieën (Restaurant, Hotel, Retail, …) voor
              filtering, CRM en toekomstige automations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/settings/company-categories" />}
            >
              Open Company Categories
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Security</CardTitle>
            <CardDescription>
              MFA, sessions, devices, SSO, access policies, RBAC, and enterprise
              audit logs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/security" />}
            >
              Open Security dashboard
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Billing</CardTitle>
            <CardDescription>
              Plans, trials, seats, usage, invoices, Stripe portal, and upgrades.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/billing" />}
            >
              Open Billing dashboard
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Mobile & PWA</CardTitle>
            <CardDescription>
              Install app, offline queue, push notifications, and device
              capabilities.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/settings/mobile" />}
            >
              Open Mobile & PWA settings
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">White Label</CardTitle>
            <CardDescription>
              Rebrand logos, colors, fonts, domains, feature toggles, and email
              for partners and enterprises.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/settings/white-label" />}
            >
              Open White Label settings
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">API & Webhooks</CardTitle>
            <CardDescription>
              Manage API keys, outbound webhooks, usage, and OpenAPI docs for
              partner integrations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/api-management" />}
            >
              Open API Management
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">AI & email intelligence</CardTitle>
            <CardDescription>
              Beheer AI feature flags, budgetten en veiligheidsinstellingen voor
              je organisatie.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/settings/ai" />}
            >
              Open AI-instellingen
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-none">
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
    </div>
  );
}
