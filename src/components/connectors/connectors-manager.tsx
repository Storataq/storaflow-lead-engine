"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    toast.success(
      `${result.message} · ${result.runtimeMs ?? 0} ms`,
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm sm:max-w-xs"
          placeholder="Zoek connector…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={category}
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
                <TableCell className="text-muted-foreground">
                  {item.provider}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {item.category}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {item.capabilities.supportedCountries.length
                    ? item.capabilities.supportedCountries.slice(0, 4).join(", ")
                    : "Worldwide"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {item.capabilities.supportedLanguages.length
                    ? item.capabilities.supportedLanguages.join(", ")
                    : "Any"}
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
                    Run Mock Test
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
              Run Mock Test
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
