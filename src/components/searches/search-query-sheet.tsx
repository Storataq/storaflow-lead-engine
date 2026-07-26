"use client";

import { useActionState, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { ChipMultiInput } from "@/components/searches/chip-multi-input";
import {
  FilterableCodeChecklist,
  toCountryOptions,
  toIndustryOptions,
  toLanguageOptions,
  toSourceOptions,
} from "@/components/searches/filterable-code-checklist";
import { SearchQueryPreviewPanel } from "@/components/searches/search-query-preview";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { COUNTRIES } from "@/lib/international/countries";
import { INDUSTRIES } from "@/lib/international/industries";
import { LANGUAGES } from "@/lib/international/languages";
import { SOURCES } from "@/lib/international/sources";
import {
  createSearchQueryAction,
  updateSearchQueryAction,
  type SearchActionResult,
} from "@/lib/searches/actions";
import {
  COMPANY_SIZE_OPTIONS,
  SEARCH_CRITERIA_STATUSES,
} from "@/lib/searches/constants";
import type { SearchPreviewInput } from "@/lib/searches/preview";
import type { SearchQueryRow } from "@/lib/searches/queries";
import { cn } from "@/lib/utils";

type SearchQuerySheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: SearchQueryRow | null;
  onSaved?: () => void;
};

const initialState: SearchActionResult | null = null;

const countryOptions = toCountryOptions(COUNTRIES);
const languageOptions = toLanguageOptions(LANGUAGES);
const industryOptions = toIndustryOptions(INDUSTRIES);
const sourceOptions = toSourceOptions(SOURCES);

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-xl border border-border p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-medium">{title}</h3>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function SearchQuerySheetForm({
  isEdit,
  initial,
  onOpenChange,
  onSaved,
}: {
  isEdit: boolean;
  initial?: SearchQueryRow | null;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}) {
  const action = isEdit ? updateSearchQueryAction : createSearchQueryAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [tab, setTab] = useState<"basis" | "preview">("basis");

  const [name, setName] = useState(initial?.name ?? "");
  const [searchPrompt, setSearchPrompt] = useState(
    initial?.search_prompt ?? "",
  );
  const [countries, setCountries] = useState<string[]>(
    initial?.countries ?? [],
  );
  const [regions, setRegions] = useState<string[]>(initial?.regions ?? []);
  const [cities, setCities] = useState<string[]>(initial?.cities ?? []);
  const [languages, setLanguages] = useState<string[]>(
    initial?.languages ?? [],
  );
  const [industries, setIndustries] = useState<string[]>(
    initial?.industries ?? [],
  );
  const [sources, setSources] = useState<string[]>(
    initial?.sources?.length ? initial.sources : ["google_maps"],
  );
  const [keywords, setKeywords] = useState<string[]>(initial?.keywords ?? []);
  const [companySize, setCompanySize] = useState<string>(
    initial?.company_size ?? "",
  );
  const [status, setStatus] = useState<string>(
    initial?.status === "active" ||
      initial?.status === "paused" ||
      initial?.status === "draft"
      ? initial.status
      : "draft",
  );
  const [websiteRequired, setWebsiteRequired] = useState(
    initial?.website_required ?? false,
  );
  const [linkedinRequired, setLinkedinRequired] = useState(
    initial?.linkedin_required ?? false,
  );

  useEffect(() => {
    if (!state) return;
    if (state.success) {
      toast.success(state.message);
      onOpenChange(false);
      onSaved?.();
    }
  }, [state, onOpenChange, onSaved]);

  const previewInput: SearchPreviewInput = useMemo(
    () => ({
      name,
      searchPrompt,
      countries,
      regions,
      cities,
      languages,
      industries,
      sources,
      keywords,
      companySize,
      websiteRequired,
      linkedinRequired,
      status,
    }),
    [
      name,
      searchPrompt,
      countries,
      regions,
      cities,
      languages,
      industries,
      sources,
      keywords,
      companySize,
      websiteRequired,
      linkedinRequired,
      status,
    ],
  );

  return (
    <form action={formAction} className="flex min-h-0 flex-1 flex-col">
      {isEdit ? <input type="hidden" name="id" value={initial?.id} /> : null}

      <div className="border-b border-border px-4 py-2">
        <div className="inline-flex rounded-xl bg-muted/60 p-1">
          <TabButton
            active={tab === "basis"}
            label="Basis"
            onClick={() => setTab("basis")}
          />
          <TabButton
            active={tab === "preview"}
            label="Preview"
            onClick={() => setTab("preview")}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4">
        {tab === "basis" ? (
          <div className="mx-auto w-full max-w-xl space-y-4">
            <Section
              title="Basis"
              description="Naam, status en AI-prompt voor deze zoekopdracht."
            >
              <div className="space-y-2">
                <Label htmlFor="name">Naam *</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="bijv. Bloemenwinkels Amsterdam"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="search_prompt">AI Search Prompt</Label>
                <Textarea
                  id="search_prompt"
                  name="search_prompt"
                  rows={4}
                  value={searchPrompt}
                  onChange={(event) => setSearchPrompt(event.target.value)}
                  placeholder="Find independent flower shops and florists in Amsterdam."
                />
                <p className="text-xs text-muted-foreground">
                  Optioneel. Minimaal één keyword, branche of prompt is verplicht.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  name="status"
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  {SEARCH_CRITERIA_STATUSES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </Section>

            <Section
              title="Locatie"
              description="ISO-landen plus regio's en steden."
            >
              <FilterableCodeChecklist
                label="Landen"
                name="countries"
                required
                options={countryOptions}
                selected={countries}
                onChange={setCountries}
                searchPlaceholder="Zoek op land of ISO-code…"
              />

              <ChipMultiInput
                label="Regio's"
                name="regions"
                values={regions}
                onChange={setRegions}
                placeholder="Typ een regio en druk Enter"
                hint="Bijv. Noord-Holland, Bavaria"
              />

              <ChipMultiInput
                label="Steden"
                name="cities"
                values={cities}
                onChange={setCities}
                placeholder="Typ een stad en druk Enter"
                hint="Bijv. Amsterdam"
              />
            </Section>

            <Section
              title="Markt & taal"
              description="Keywords, branches en talen."
            >
              <ChipMultiInput
                label="Keywords"
                name="keywords"
                values={keywords}
                onChange={setKeywords}
                placeholder="Typ een keyword en druk Enter"
                hint="Minimaal keyword, branche of AI-prompt"
              />

              <FilterableCodeChecklist
                label="Branches"
                name="industries"
                options={industryOptions}
                selected={industries}
                onChange={setIndustries}
                searchPlaceholder="Zoek op branche…"
              />

              <FilterableCodeChecklist
                label="Talen"
                name="languages"
                options={languageOptions}
                selected={languages}
                onChange={setLanguages}
                searchPlaceholder="Zoek op taal of ISO-code…"
              />
            </Section>

            <Section
              title="Bronnen & eisen"
              description="Kies connectors en verplichte signalen."
            >
              <FilterableCodeChecklist
                label="Databronnen"
                name="sources"
                options={sourceOptions}
                selected={sources}
                onChange={setSources}
                searchPlaceholder="Zoek op bron…"
              />

              <div className="space-y-2">
                <Label htmlFor="company_size">Bedrijfsgrootte</Label>
                <select
                  id="company_size"
                  name="company_size"
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={companySize}
                  onChange={(event) => setCompanySize(event.target.value)}
                >
                  <option value="">Optioneel</option>
                  {COMPANY_SIZE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Label htmlFor="website_required">Website verplicht</Label>
                    <p className="text-xs text-muted-foreground">
                      Alleen leads met een website meenemen.
                    </p>
                  </div>
                  <Switch
                    id="website_required"
                    checked={websiteRequired}
                    onCheckedChange={(checked) =>
                      setWebsiteRequired(checked === true)
                    }
                  />
                </div>
                {websiteRequired ? (
                  <input type="hidden" name="website_required" value="on" />
                ) : null}

                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Label htmlFor="linkedin_required">
                      LinkedIn verplicht
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Alleen leads met LinkedIn-aanwezigheid meenemen.
                    </p>
                  </div>
                  <Switch
                    id="linkedin_required"
                    checked={linkedinRequired}
                    onCheckedChange={(checked) =>
                      setLinkedinRequired(checked === true)
                    }
                  />
                </div>
                {linkedinRequired ? (
                  <input type="hidden" name="linkedin_required" value="on" />
                ) : null}
              </div>
            </Section>

            {state && !state.success ? (
              <Alert variant="destructive">
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            ) : null}
          </div>
        ) : (
          <div className="mx-auto w-full max-w-xl">
            <SearchQueryPreviewPanel input={previewInput} />
          </div>
        )}
      </div>

      <SheetFooter className="shrink-0 border-t border-border sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
        >
          Annuleren
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Opslaan…" : "Opslaan"}
        </Button>
      </SheetFooter>
    </form>
  );
}

export function SearchQuerySheet({
  open,
  onOpenChange,
  initial,
  onSaved,
}: SearchQuerySheetProps) {
  const isEdit = Boolean(initial?.id);
  const formKey = `${isEdit ? initial?.id : "new"}-${open ? "open" : "closed"}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full max-w-[100vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(720px,calc(100vw-1.5rem))]"
      >
        <SheetHeader className="shrink-0 border-b border-border pr-12">
          <SheetTitle>
            {isEdit ? "Zoekopdracht bewerken" : "Nieuwe zoekopdracht"}
          </SheetTitle>
          <SheetDescription>
            Vul criteria in, controleer de preview en sla op. Start daarna een
            Google Maps mock scrape vanaf het overzicht.
          </SheetDescription>
        </SheetHeader>

        {open ? (
          <SearchQuerySheetForm
            key={formKey}
            isEdit={isEdit}
            initial={initial}
            onOpenChange={onOpenChange}
            onSaved={onSaved}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
