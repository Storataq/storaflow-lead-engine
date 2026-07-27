"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { ContactBadgeList } from "@/components/crm/contact-badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CrmLeadContactWithIntelligence } from "@/lib/crm/contact-intelligence/queries";

type Props = {
  contacts: CrmLeadContactWithIntelligence[];
};

function contactName(c: CrmLeadContactWithIntelligence): string {
  return `${c.first_name} ${c.last_name}`.trim() || "Naamloos";
}

export function ContactsIntelligenceFilters({ contacts }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function applyFilters(formData: FormData) {
    const params = new URLSearchParams();
    const keys = [
      "q",
      "department",
      "managementLevel",
      "country",
      "language",
      "preferredChannel",
      "minHealthScore",
      "minQualityScore",
      "minConfidence",
    ] as const;

    for (const key of keys) {
      const value = String(formData.get(key) ?? "").trim();
      if (value) params.set(key, value);
    }
    if (formData.get("decisionMaker") === "on") {
      params.set("decisionMaker", "1");
    }

    startTransition(() => {
      router.push(`/crm/contacts?${params.toString()}`);
    });
  }

  return (
    <div className="space-y-4">
      <form
        className="grid gap-3 rounded-lg border border-border p-4 md:grid-cols-3 lg:grid-cols-4"
        action={applyFilters}
      >
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="q">Search</Label>
          <Input
            id="q"
            name="q"
            defaultValue={searchParams.get("q") ?? ""}
            placeholder="Name, email, title…"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="department">Department</Label>
          <Input
            id="department"
            name="department"
            defaultValue={searchParams.get("department") ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="managementLevel">Management level</Label>
          <Input
            id="managementLevel"
            name="managementLevel"
            defaultValue={searchParams.get("managementLevel") ?? ""}
            placeholder="C-level, Manager…"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            name="country"
            defaultValue={searchParams.get("country") ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="language">Language</Label>
          <Input
            id="language"
            name="language"
            defaultValue={searchParams.get("language") ?? ""}
            placeholder="nl, en…"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="preferredChannel">Communication preference</Label>
          <Input
            id="preferredChannel"
            name="preferredChannel"
            defaultValue={searchParams.get("preferredChannel") ?? ""}
            placeholder="email, phone…"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="minHealthScore">Min health score</Label>
          <Input
            id="minHealthScore"
            name="minHealthScore"
            type="number"
            min={0}
            max={100}
            defaultValue={searchParams.get("minHealthScore") ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="minQualityScore">Min contact score</Label>
          <Input
            id="minQualityScore"
            name="minQualityScore"
            type="number"
            min={0}
            max={100}
            defaultValue={searchParams.get("minQualityScore") ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="minConfidence">Min AI confidence</Label>
          <Input
            id="minConfidence"
            name="minConfidence"
            type="number"
            min={0}
            max={100}
            defaultValue={searchParams.get("minConfidence") ?? ""}
          />
        </div>
        <div className="flex items-end gap-3">
          <label className="flex min-h-9 items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="decisionMaker"
              defaultChecked={searchParams.get("decisionMaker") === "1"}
              className="size-4 rounded border-border"
            />
            Decision maker
          </label>
        </div>
        <div className="flex items-end gap-2 md:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Filtering…" : "Apply filters"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => startTransition(() => router.push("/crm/contacts"))}
          >
            Reset
          </Button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Contact</th>
              <th className="px-3 py-2 font-medium">Lead</th>
              <th className="px-3 py-2 font-medium">Dept</th>
              <th className="px-3 py-2 font-medium">Health</th>
              <th className="px-3 py-2 font-medium">Quality</th>
              <th className="px-3 py-2 font-medium">Conf.</th>
              <th className="px-3 py-2 font-medium">Badges</th>
            </tr>
          </thead>
          <tbody>
            {contacts.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  Geen contacten gevonden voor deze filters.
                </td>
              </tr>
            ) : (
              contacts.map((contact) => (
                <tr
                  key={contact.id}
                  className="border-b border-border/70 last:border-0"
                >
                  <td className="px-3 py-2">
                    <Link
                      href={`/crm/contacts/${contact.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {contactName(contact)}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {contact.job_title ?? "—"}
                    </p>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {contact.lead ? (
                      <Link
                        href={`/crm/leads/${contact.lead.id}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {contact.lead.company_name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2">{contact.department ?? "—"}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {contact.health_score != null
                      ? Math.round(Number(contact.health_score))
                      : "—"}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {contact.quality_score != null
                      ? Math.round(Number(contact.quality_score))
                      : "—"}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {contact.intelligence_confidence != null
                      ? `${Math.round(Number(contact.intelligence_confidence))}%`
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <ContactBadgeList
                      badges={
                        Array.isArray(contact.badges_json)
                          ? (contact.badges_json as Array<{
                              code: string;
                              label?: string;
                            }>)
                          : []
                      }
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
