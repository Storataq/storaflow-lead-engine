"use client";

import { useActionState, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import {
  FilterableCodeChecklist,
  toCountryOptions,
  toIndustryOptions,
  toLanguageOptions,
  toSourceOptions,
} from "@/components/searches/filterable-code-checklist";
import { SearchQueryPreviewPanel } from "@/components/searches/search-query-preview";
import {
  createSearchQueryAction,
  updateSearchQueryAction,
  type SearchActionResult,
} from "@/lib/searches/actions";
import {
  COMPANY_SIZE_OPTIONS,
  SEARCH_CRITERIA_STATUSES,
} from "@/lib/searches/constants";
import { parseListFromTextarea } from "@/lib/searches/schema";
import type { SearchQueryRow } from "@/lib/searches/queries";
import { COUNTRIES } from "@/lib/international/countries";
import { INDUSTRIES } from "@/lib/international/industries";
import { LANGUAGES } from "@/lib/international/languages";
import { SOURCES } from "@/lib/international/sources";
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
import type { SearchPreviewInput } from "@/lib/searches/preview";

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

  const [name, setName] = useState(initial?.name ?? "");
  const [searchPrompt, setSearchPrompt] = useState(
    initial?.search_prompt ?? "",
  );
  const [countries, setCountries] = useState<string[]>(
    initial?.countries ?? [],
  );
  const [regionsText, setRegionsText] = useState(
    (initial?.regions ?? []).join("\n"),
  );
  const [citiesText, setCitiesText] = useState(
    (initial?.cities ?? []).join("\n"),
  );
  const [languages, setLanguages] = useState<string[]>(
    initial?.languages ?? [],
  );
  const [industries, setIndustries] = useState<string[]>(
    initial?.industries ?? [],
  );
  const [sources, setSources] = useState<string[]>(initial?.sources ?? []);
  const [keywordsText, setKeywordsText] = useState(
    (initial?.keywords ?? []).join("\n"),
  );
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
      regions: parseListFromTextarea(regionsText),
      cities: parseListFromTextarea(citiesText),
      languages,
      industries,
      sources,
      keywords: parseListFromTextarea(keywordsText),
      companySize,
      websiteRequired,
      linkedinRequired,
      status,
    }),
    [
      name,
      searchPrompt,
      countries,
      regionsText,
      citiesText,
      languages,
      industries,
      sources,
      keywordsText,
      companySize,
      websiteRequired,
      linkedinRequired,
      status,
    ],
  );

  return (
    <form action={formAction} className="flex min-h-0 flex-1 flex-col">
      {isEdit ? <input type="hidden" name="id" value={initial?.id} /> : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          <div className="space-y-4">
            <Section
              title="Basis"
              description="Naam, status en AI-prompt voor deze wereldwijde zoekopdracht."
            >
              <div className="space-y-2">
                <Label htmlFor="name">Naam *</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="bijv. Florists South Holland"
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
                  placeholder="Find florists in Germany with a website and LinkedIn profile"
                />
                <p className="text-xs text-muted-foreground">
                  Natuurlijke taal. Later kan AI dit uitbreiden naar
                  gestructureerde filters.
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
              description="ISO-landen plus vrije regio's en steden wereldwijd."
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

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="regions">Regio&apos;s / staten / provincies</Label>
                  <Textarea
                    id="regions"
                    name="regions"
                    rows={4}
                    value={regionsText}
                    onChange={(event) => setRegionsText(event.target.value)}
                    placeholder={"California\nBayern\nVlaanderen\nDubai"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cities">Steden</Label>
                  <Textarea
                    id="cities"
                    name="cities"
                    rows={4}
                    value={citiesText}
                    onChange={(event) => setCitiesText(event.target.value)}
                    placeholder={"Amsterdam\nLondon\nDubai\nSingapore"}
                  />
                </div>
              </div>
            </Section>

            <Section
              title="Markt & taal"
              description="Talen, branches en keywords voor leadkwaliteit."
            >
              <FilterableCodeChecklist
                label="Talen"
                name="languages"
                options={languageOptions}
                selected={languages}
                onChange={setLanguages}
                searchPlaceholder="Zoek op taal of ISO-code…"
              />

              <FilterableCodeChecklist
                label="Branches"
                name="industries"
                options={industryOptions}
                selected={industries}
                onChange={setIndustries}
                searchPlaceholder="Zoek op branche…"
              />

              <div className="space-y-2">
                <Label htmlFor="keywords">Keywords *</Label>
                <Textarea
                  id="keywords"
                  name="keywords"
                  required
                  rows={4}
                  value={keywordsText}
                  onChange={(event) => setKeywordsText(event.target.value)}
                  placeholder={"florist\nbloemist\nfleuriste"}
                />
                <p className="text-xs text-muted-foreground">
                  Eén keyword per regel. Gebruik lokale termen waar nodig.
                </p>
              </div>
            </Section>

            <Section
              title="Bronnen & eisen"
              description="Waar scrapen we, en welke signalen zijn verplicht."
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
                <Label htmlFor="company_size">Company size</Label>
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
                  <div>
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
                  <div>
                    <Label htmlFor="linkedin_required">LinkedIn verplicht</Label>
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

          <aside className="xl:sticky xl:top-0 xl:self-start">
            <SearchQueryPreviewPanel input={previewInput} />
          </aside>
        </div>
      </div>

      <SheetFooter className="border-t border-border sm:flex-row sm:justify-end">
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
        className="flex w-full flex-col gap-0 p-0 sm:max-w-xl md:max-w-3xl xl:max-w-5xl"
      >
        <SheetHeader className="border-b border-border">
          <SheetTitle>
            {isEdit ? "Zoekopdracht bewerken" : "Nieuwe zoekopdracht"}
          </SheetTitle>
          <SheetDescription>
            Wereldwijde Lead Engine-criteria met ISO-landen, talen, bronnen en
            AI-prompt. Scraping volgt later.
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
