"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  buildSearchFilterChips,
  buildSearchQueryPreview,
  countActiveFilters,
  type SearchPreviewInput,
} from "@/lib/searches/preview";
import { searchStatusLabel } from "@/lib/searches/constants";

type SearchQueryPreviewPanelProps = {
  input: SearchPreviewInput;
};

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-3">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="break-words text-sm text-foreground">{value}</dd>
    </div>
  );
}

export function SearchQueryPreviewPanel({
  input,
}: SearchQueryPreviewPanelProps) {
  const chips = buildSearchFilterChips(input);
  const preview = buildSearchQueryPreview(input);
  const activeCount = countActiveFilters(input);
  const title = input.name.trim();
  const hasContent =
    Boolean(title) ||
    Boolean(input.searchPrompt.trim()) ||
    activeCount > 0;

  if (!hasContent) {
    return (
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Preview</CardTitle>
          <CardDescription>
            Vul links criteria in om hier een live samenvatting te zien.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nog niets ingevuld. Start met een naam, land en keyword.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-none">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Preview</CardTitle>
              <CardDescription>
                Live weergave van de huidige formulierwaarden.
              </CardDescription>
            </div>
            <Badge variant="outline">{searchStatusLabel(input.status)}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <dl className="space-y-3">
            <PreviewRow label="Naam" value={title || "—"} />
            <PreviewRow
              label="Status"
              value={searchStatusLabel(input.status)}
            />
            <PreviewRow
              label="AI prompt"
              value={input.searchPrompt.trim() || "—"}
            />
            <PreviewRow
              label="Website"
              value={input.websiteRequired ? "Verplicht" : "Optioneel"}
            />
            <PreviewRow
              label="LinkedIn"
              value={input.linkedinRequired ? "Verplicht" : "Optioneel"}
            />
          </dl>
          <pre className="whitespace-pre-wrap break-words rounded-lg border border-border bg-muted/40 p-3 font-sans text-sm leading-relaxed text-foreground">
            {preview}
          </pre>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Actieve filters</CardTitle>
          <CardDescription>
            {activeCount === 0
              ? "Nog geen filters geselecteerd."
              : `${activeCount} actieve filter${activeCount === 1 ? "" : "s"}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chips.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Selecteer landen, keywords of bronnen om een samenvatting te zien.
            </p>
          ) : (
            <div className="space-y-3">
              {Object.entries(
                chips.reduce<Record<string, typeof chips>>((acc, chip) => {
                  acc[chip.group] ??= [];
                  acc[chip.group].push(chip);
                  return acc;
                }, {}),
              ).map(([group, groupChips]) => (
                <div key={group} className="space-y-1.5">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {group}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {groupChips.map((chip) => (
                      <Badge
                        key={chip.id}
                        variant="secondary"
                        className="max-w-full break-words whitespace-normal"
                      >
                        {chip.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
