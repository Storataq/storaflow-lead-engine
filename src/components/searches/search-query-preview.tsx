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

export function SearchQueryPreviewPanel({
  input,
}: SearchQueryPreviewPanelProps) {
  const chips = buildSearchFilterChips(input);
  const preview = buildSearchQueryPreview(input);
  const activeCount = countActiveFilters(input);
  const title = input.name.trim() || "Naamloze zoekopdracht";

  return (
    <div className="space-y-4">
      <Card className="shadow-none">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Preview</CardTitle>
              <CardDescription>
                Zo ziet de volledige zoekopdracht eruit.
              </CardDescription>
            </div>
            <Badge variant="outline">{searchStatusLabel(input.status)}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-medium">{title}</p>
          </div>
          <pre className="whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-3 font-sans text-sm leading-relaxed text-foreground">
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
                      <Badge key={chip.id} variant="secondary">
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
