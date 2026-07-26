"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  runConnectorMockTestAction,
  type ConnectorMockTestResult,
} from "@/lib/scraping/actions";
import type { ConnectorManifest } from "@/lib/scraping/types/connector";

type ConnectorDetailClientProps = {
  manifest: ConnectorManifest;
};

export function ConnectorDetailClient({ manifest }: ConnectorDetailClientProps) {
  const [pending, startTransition] = useTransition();
  const [lastRun, setLastRun] = useState<ConnectorMockTestResult | null>(null);

  function handleMockTest() {
    if (pending) return;
    startTransition(async () => {
      const result = await runConnectorMockTestAction(manifest.code);
      setLastRun(result);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
    });
  }

  const caps = manifest.capabilities;
  const config = manifest.defaultConfig;
  const previewResults = lastRun?.results?.slice(0, 10) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{manifest.health}</Badge>
        <Badge variant="outline">{manifest.mode === "mock" ? "Mock" : "Live"}</Badge>
        <Badge variant="outline">{manifest.category}</Badge>
        <Button size="sm" disabled={pending} onClick={handleMockTest}>
          {pending
            ? "Bezig…"
            : manifest.code === "google_maps"
              ? "Run Google Maps Mock Test"
              : "Run Mock Test"}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Beschrijving</CardTitle>
            <CardDescription>{manifest.provider}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {manifest.description}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Configuratie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Enabled" value={config.enabled ? "Ja" : "Nee"} />
            <Row label="Priority" value={String(config.priority)} />
            <Row label="Max concurrency" value={String(config.maxConcurrency)} />
            <Row label="Timeout" value={`${config.timeoutMs} ms`} />
            <Row label="Retry" value={String(config.retryCount)} />
            <Row
              label="Rate limit"
              value={`${config.rateLimitPerMinute}/min`}
            />
            <Row
              label="Proxy"
              value={config.proxyEnabled ? "Enabled" : "Disabled"}
            />
          </CardContent>
        </Card>

        <Card className="shadow-none lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Capabilities</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            <Row label="Bedrijven" value={yesNo(caps.supportsCompanies)} />
            <Row label="Contacten" value={yesNo(caps.supportsContacts)} />
            <Row label="Reviews" value={yesNo(caps.supportsReviews)} />
            <Row label="Websites" value={yesNo(caps.supportsWebsites)} />
            <Row label="Telefoon" value={yesNo(caps.supportsPhoneNumbers)} />
            <Row label="E-mail" value={yesNo(caps.supportsEmail)} />
            <Row label="Social" value={yesNo(caps.supportsSocialMedia)} />
            <Row label="Geo" value={yesNo(caps.supportsGeo)} />
            <Row label="Proxy vereist" value={yesNo(caps.requiresProxy)} />
            <Row label="Login vereist" value={yesNo(caps.requiresLogin)} />
            <Row label="API key" value={yesNo(caps.requiresApiKey)} />
            <Row
              label="Landen"
              value={
                caps.supportedCountries.length
                  ? caps.supportedCountries.join(", ")
                  : "Worldwide"
              }
            />
            <Row
              label="Talen"
              value={
                caps.supportedLanguages.length
                  ? caps.supportedLanguages.join(", ")
                  : "Any"
              }
            />
            <Row
              label="Max req/min"
              value={String(caps.maxRequestsPerMinute)}
            />
          </CardContent>
        </Card>

        <Card className="shadow-none lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Laatste mock-run</CardTitle>
            <CardDescription>
              {manifest.code === "google_maps"
                ? "Google Maps mock: Connector loaded → Mock request → Parsing → Normalization → Validation → Completed."
                : "Search → Factory → Connector → Parser → Normalizer → Validator → Deduplicator → AI placeholder"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!lastRun ? (
              <p className="text-sm text-muted-foreground">
                Nog geen test uitgevoerd.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-3 text-sm">
                  <span>Status: {lastRun.success ? "OK" : "Failed"}</span>
                  <span>Runtime: {lastRun.runtimeMs ?? 0} ms</span>
                  <span>Opgehaald: {lastRun.fetchedCount ?? 0}</span>
                  <span>Geldig: {lastRun.validCount ?? 0}</span>
                  <span>Ongeldig: {lastRun.invalidCount ?? 0}</span>
                  <span>
                    Duplicaten verwijderd: {lastRun.duplicatesRemoved ?? 0}
                  </span>
                  <span>Uiteindelijk: {lastRun.results?.length ?? 0}</span>
                </div>

                {lastRun.logs?.length ? (
                  <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-3 text-sm">
                    {lastRun.logs.map((log, index) => (
                      <li key={`${log.at}-${index}`}>
                        <span className="font-medium uppercase">{log.level}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          — {log.message}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {lastRun.legacyLogs?.length ? (
                  <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-3 text-sm">
                    {lastRun.legacyLogs.map((log, index) => (
                      <li key={`${log.at}-${index}`}>
                        <span className="font-medium">{log.event}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          — {log.message}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {previewResults.length ? (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Bedrijf</TableHead>
                          <TableHead>Land</TableHead>
                          <TableHead>Stad</TableHead>
                          <TableHead>Branche</TableHead>
                          <TableHead>Website</TableHead>
                          <TableHead>E-mail</TableHead>
                          <TableHead>Confidence</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewResults.map((item) => (
                          <TableRow key={`${item.source}-${item.sourceId}`}>
                            <TableCell className="font-medium">
                              {item.name}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {item.countryCode ?? "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {item.city ?? "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {item.industry ?? "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {item.website ?? "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {item.emails[0] ?? "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {item.confidence.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function yesNo(value: boolean): string {
  return value ? "Ja" : "Nee";
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
