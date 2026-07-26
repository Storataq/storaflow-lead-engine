"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Mail } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { TruncatedText } from "@/components/layout/truncated-text";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ContactSignal } from "@/lib/contacts/queries";

type ContactsManagerProps = {
  initialItems: ContactSignal[];
  initialError?: string | null;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ContactsManager({
  initialItems,
  initialError = null,
}: ContactsManagerProps) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "email" | "phone">(
    "all",
  );

  const filtered = useMemo(() => {
    let next = [...initialItems];
    if (typeFilter !== "all") {
      next = next.filter((item) => item.contactType === typeFilter);
    }
    if (query.trim()) {
      const needle = query.trim().toLowerCase();
      next = next.filter((item) => {
        const haystack = [
          item.companyName,
          item.value,
          item.city ?? "",
          item.country ?? "",
          item.sourceCode ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(needle);
      });
    }
    return next;
  }, [initialItems, query, typeFilter]);

  if (initialError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{initialError}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative w-full sm:max-w-xs">
            <label htmlFor="contacts-search" className="sr-only">
              Zoek contactgegevens
            </label>
            <Input
              id="contacts-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Zoeken op bedrijf of waarde…"
              aria-label="Zoek contactgegevens"
            />
          </div>
          <select
            className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            value={typeFilter}
            aria-label="Filter op type"
            onChange={(event) =>
              setTypeFilter(event.target.value as "all" | "email" | "phone")
            }
          >
            <option value="all">Alle types</option>
            <option value="email">E-mail</option>
            <option value="phone">Telefoon</option>
          </select>
        </div>
        <Button
          nativeButton={false}
          variant="outline"
          render={<Link href="/zoekopdrachten" />}
        >
          Start vanaf zoekopdracht
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Mail}
          title={
            initialItems.length === 0
              ? "Nog geen contactgegevens"
              : "Geen resultaten"
          }
          description={
            initialItems.length === 0
              ? "Publieke e-mailadressen en telefoonnummers uit mock scrapes verschijnen hier."
              : "Geen contactgegevens gevonden voor deze filters."
          }
          actionLabel={
            initialItems.length === 0 ? "Naar zoekopdrachten" : undefined
          }
          actionHref={
            initialItems.length === 0 ? "/zoekopdrachten" : undefined
          }
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-border lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Waarde</TableHead>
                  <TableHead>Bedrijf</TableHead>
                  <TableHead>Locatie</TableHead>
                  <TableHead>Bron</TableHead>
                  <TableHead>Gevonden</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant="secondary">
                        {item.contactType === "email" ? "E-mail" : "Telefoon"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <TruncatedText
                        value={item.value}
                        className="font-medium text-foreground"
                        maxWidthClassName="max-w-64"
                      />
                    </TableCell>
                    <TableCell>
                      {item.companyId ? (
                        <Link
                          href={`/companies/${item.companyId}`}
                          className="font-medium hover:underline"
                        >
                          {item.companyName}
                        </Link>
                      ) : (
                        <TruncatedText value={item.companyName} />
                      )}
                    </TableCell>
                    <TableCell>
                      <TruncatedText
                        value={
                          [item.city, item.country].filter(Boolean).join(", ") ||
                          null
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <TruncatedText value={item.sourceCode} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(item.foundAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-3 lg:hidden">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="space-y-2 rounded-xl border border-border p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium break-all">{item.value}</p>
                  <Badge variant="secondary">
                    {item.contactType === "email" ? "E-mail" : "Telefoon"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {item.companyName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.sourceCode ?? "bron onbekend"} ·{" "}
                  {formatDate(item.foundAt)}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
