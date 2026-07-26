"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Building2 } from "lucide-react";

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
import type { CompanyRow } from "@/lib/companies/queries";

type CompaniesManagerProps = {
  initialItems: CompanyRow[];
  initialError?: string | null;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusLabel(status: string): string {
  switch (status) {
    case "new":
      return "Nieuw";
    case "reviewed":
      return "Beoordeeld";
    case "qualified":
      return "Gekwalificeerd";
    case "not_relevant":
      return "Niet relevant";
    case "contacted":
      return "Benaderd";
    case "customer":
      return "Klant";
    case "blocked":
      return "Geblokkeerd";
    default:
      return status;
  }
}

export function CompaniesManager({
  initialItems,
  initialError = null,
}: CompaniesManagerProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return initialItems;
    const needle = query.trim().toLowerCase();
    return initialItems.filter((item) => {
      const haystack = [
        item.company_name,
        item.city ?? "",
        item.country ?? "",
        item.industry ?? "",
        item.website_url ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [initialItems, query]);

  if (initialError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{initialError}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <label htmlFor="companies-search" className="sr-only">
            Zoek bedrijven
          </label>
          <Input
            id="companies-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Zoeken op naam, stad, land…"
            aria-label="Zoek bedrijven"
          />
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
          icon={Building2}
          title={
            initialItems.length === 0
              ? "Nog geen bedrijven"
              : "Geen resultaten"
          }
          description={
            initialItems.length === 0
              ? "Voer een eerste mock scrape uit vanuit een zoekopdracht. Gevonden bedrijven verschijnen hier."
              : "Geen bedrijven gevonden voor deze zoekopdracht."
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
                  <TableHead>Bedrijf</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Stad</TableHead>
                  <TableHead>Land</TableHead>
                  <TableHead>Branche</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead>Gevonden</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Link
                        href={`/companies/${item.id}`}
                        className="font-medium hover:underline"
                      >
                        {item.company_name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {statusLabel(item.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <TruncatedText value={item.city} />
                    </TableCell>
                    <TableCell>
                      <TruncatedText value={item.country} />
                    </TableCell>
                    <TableCell>
                      <TruncatedText value={item.industry} />
                    </TableCell>
                    <TableCell>
                      <TruncatedText
                        value={item.website_url}
                        maxWidthClassName="max-w-56"
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(item.first_found_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-3 lg:hidden">
            {filtered.map((item) => (
              <Link
                key={item.id}
                href={`/companies/${item.id}`}
                className="block space-y-2 rounded-xl border border-border p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{item.company_name}</p>
                  <Badge variant="secondary">{statusLabel(item.status)}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {[item.city, item.country].filter(Boolean).join(" · ") ||
                    "Geen locatie"}
                </p>
                {item.website_url ? (
                  <p className="truncate text-xs text-muted-foreground">
                    {item.website_url}
                  </p>
                ) : null}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
