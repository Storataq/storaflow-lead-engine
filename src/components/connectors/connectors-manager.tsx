"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Plug } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/layout/empty-state";
import { TruncatedText } from "@/components/layout/truncated-text";
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
import { runConnectorMockTestAction } from "@/lib/scraping/actions";
import type { ConnectorManifest } from "@/lib/scraping/types/connector";

type ConnectorsManagerProps = {
  connectors: ConnectorManifest[];
};

export function ConnectorsManager({ connectors }: ConnectorsManagerProps) {
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const categories = useMemo(() => {
    return [...new Set(connectors.map((item) => item.category))].sort();
  }, [connectors]);

  const filtered = useMemo(() => {
    return connectors.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (!query.trim()) return true;
      const needle = query.trim().toLowerCase();
      return (
        item.name.toLowerCase().includes(needle) ||
        item.code.toLowerCase().includes(needle) ||
        item.provider.toLowerCase().includes(needle)
      );
    });
  }, [connectors, category, query]);

  async function handleMockTest(code: string) {
    setPendingCode(code);
    const result = await runConnectorMockTestAction(code);
    setPendingCode(null);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success(`${result.message} · ${result.runtimeMs ?? 0} ms`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="connectors-search" className="sr-only">
          Zoek connectors
        </label>
        <Input
          id="connectors-search"
          className="sm:max-w-xs"
          placeholder="Zoek connector…"
          value={query}
          aria-label="Zoek connectors"
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          value={category}
          aria-label="Filter op categorie"
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="all">Alle categorieën</option>
          {categories.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Plug}
          title="Geen connectors gevonden"
          description="Pas je filters aan of controleer of de connector-registry is geladen."
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-border lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Naam</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Categorie</TableHead>
                  <TableHead>Landen</TableHead>
                  <TableHead>Talen</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Actief</TableHead>
                  <TableHead className="text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.code}>
                    <TableCell>
                      <Link
                        href={`/connectors/${item.code}`}
                        className="font-medium hover:underline"
                      >
                        {item.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{item.code}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.health}</Badge>
                    </TableCell>
                    <TableCell>
                      <TruncatedText value={item.provider} />
                    </TableCell>
                    <TableCell>
                      <TruncatedText value={item.category} />
                    </TableCell>
                    <TableCell>
                      <TruncatedText
                        value={
                          item.capabilities.supportedCountries.length
                            ? item.capabilities.supportedCountries
                                .slice(0, 4)
                                .join(", ")
                            : "Wereldwijd"
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <TruncatedText
                        value={
                          item.capabilities.supportedLanguages.length
                            ? item.capabilities.supportedLanguages.join(", ")
                            : "Alle"
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {item.mode === "mock" ? "Mock" : "Live"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.defaultConfig.enabled ? "Ja" : "Nee"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending && pendingCode === item.code}
                        onClick={() => {
                          startTransition(() => {
                            void handleMockTest(item.code);
                          });
                        }}
                      >
                        {pending && pendingCode === item.code
                          ? "Bezig…"
                          : "Mock-test"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-3 lg:hidden">
            {filtered.map((item) => (
              <div
                key={item.code}
                className="space-y-3 rounded-xl border border-border p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/connectors/${item.code}`}
                      className="font-medium hover:underline"
                    >
                      {item.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {item.category} · {item.provider}
                    </p>
                  </div>
                  <Badge variant="outline">Mock</Badge>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  disabled={pending && pendingCode === item.code}
                  onClick={() => {
                    startTransition(() => {
                      void handleMockTest(item.code);
                    });
                  }}
                >
                  {pending && pendingCode === item.code
                    ? "Bezig…"
                    : "Mock-test"}
                </Button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
