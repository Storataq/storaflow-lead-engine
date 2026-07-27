import type { Metadata } from "next";

import { CsCustomersManager } from "@/components/customer-success/cs-customers-manager";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CS_UI } from "@/lib/customer-success/constants";
import {
  bootstrapCustomerSuccess,
  listCsProfiles,
  listCustomerCompanies,
} from "@/lib/customer-success/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: CS_UI.customersTitle };

type SearchParams = Promise<{ q?: string; country?: string; industry?: string }>;

export default async function CsCustomersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const context = await getActiveOrganization();
  if (!context) return null;
  await bootstrapCustomerSuccess(
    context.organization.id,
    context.membership.user_id,
  );
  const sp = await searchParams;
  const filters = {
    q: sp.q || undefined,
    country: sp.country || undefined,
    industry: sp.industry || undefined,
  };
  const [companies, profiles] = await Promise.all([
    listCustomerCompanies(context.organization.id, filters),
    listCsProfiles(context.organization.id),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={CS_UI.customersTitle}
        description="Klanten met health, churn en bulk analyse / success plans."
      />
      <Card>
        <CardHeader>
          <CardTitle>Customer list</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="mb-4 flex flex-wrap gap-2 text-sm" method="get">
            <input
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Zoek bedrijf"
              className="h-9 rounded-md border border-input bg-transparent px-3"
            />
            <input
              name="industry"
              defaultValue={sp.industry ?? ""}
              placeholder="Branche"
              className="h-9 rounded-md border border-input bg-transparent px-3"
            />
            <input
              name="country"
              defaultValue={sp.country ?? ""}
              placeholder="Land"
              className="h-9 rounded-md border border-input bg-transparent px-3"
            />
            <button
              type="submit"
              className="h-9 rounded-md bg-primary px-3 text-primary-foreground"
            >
              Filter
            </button>
          </form>
          <CsCustomersManager companies={companies} profiles={profiles} />
        </CardContent>
      </Card>
    </div>
  );
}
