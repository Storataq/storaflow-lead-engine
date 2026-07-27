import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CS_UI } from "@/lib/customer-success/constants";
import {
  bootstrapCustomerSuccess,
  listCsOnboarding,
  listCustomerCompanies,
} from "@/lib/customer-success/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: CS_UI.onboardingTitle };

function asChecklist(
  value: unknown,
): Array<{ label: string; done: boolean }> {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const row =
      item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return {
      label: String(row.label ?? row.id ?? ""),
      done: Boolean(row.done),
    };
  });
}

export default async function CsOnboardingPage() {
  const context = await getActiveOrganization();
  if (!context) return null;
  await bootstrapCustomerSuccess(
    context.organization.id,
    context.membership.user_id,
  );
  const [rows, companies] = await Promise.all([
    listCsOnboarding(context.organization.id),
    listCustomerCompanies(context.organization.id),
  ]);
  const nameById = new Map(companies.map((c) => [c.id, c.company_name]));

  return (
    <div className="space-y-6">
      <PageHeader
        title={CS_UI.onboardingTitle}
        description="Checklist: profiel, users, login, data, integraties, workflow, AI Copilot."
      />
      <Card>
        <CardHeader>
          <CardTitle>Onboarding progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nog geen onboarding.</p>
          ) : (
            rows.map((row) => {
              const items = asChecklist(row.checklist_json);
              return (
                <div key={row.id} className="rounded-md border px-3 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">
                      {nameById.get(row.company_id) ?? row.company_id}
                    </p>
                    <div className="flex gap-1">
                      <Badge variant="outline">{row.progress_percent}%</Badge>
                      <Badge variant="secondary">{row.status}</Badge>
                    </div>
                  </div>
                  <ul className="mt-2 space-y-1 text-muted-foreground">
                    {items.map((i) => (
                      <li key={`${row.id}-${i.label}`}>
                        {i.done ? "✓" : "○"} {i.label}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
