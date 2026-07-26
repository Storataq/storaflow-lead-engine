"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  FilterableCodeChecklist,
  toCountryOptions,
  toLanguageOptions,
} from "@/components/searches/filterable-code-checklist";
import {
  createSearchQueryAction,
  updateSearchQueryAction,
  type SearchActionResult,
} from "@/lib/searches/actions";
import {
  COMPANY_SIZE_OPTIONS,
  SEARCH_CRITERIA_STATUSES,
} from "@/lib/searches/constants";
import type { SearchQueryRow } from "@/lib/searches/queries";
import { COUNTRIES } from "@/lib/international/countries";
import { INDUSTRIES } from "@/lib/international/industries";
import { LANGUAGES } from "@/lib/international/languages";
import { SOURCES } from "@/lib/international/sources";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

type SearchQuerySheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: SearchQueryRow | null;
  onSaved?: () => void;
};

const initialState: SearchActionResult | null = null;

const countryOptions = toCountryOptions(COUNTRIES);
const languageOptions = toLanguageOptions(LANGUAGES);

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

  const [countries, setCountries] = useState<string[]>(
    initial?.countries ?? [],
  );
  const [industries, setIndustries] = useState<string[]>(
    initial?.industries ?? [],
  );
  const [languages, setLanguages] = useState<string[]>(
    initial?.languages ?? [],
  );
  const [sources, setSources] = useState<string[]>(initial?.sources ?? []);
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

  const keywordsText = useMemo(
    () => (initial?.keywords ?? []).join("\n"),
    [initial],
  );
  const regionsText = useMemo(
    () => (initial?.regions ?? []).join("\n"),
    [initial],
  );
  const citiesText = useMemo(
    () => (initial?.cities ?? []).join("\n"),
    [initial],
  );

  return (
    <form action={formAction} className="flex flex-1 flex-col gap-0">
      {isEdit ? <input type="hidden" name="id" value={initial?.id} /> : null}

      <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-4">
        <div className="space-y-2">
          <Label htmlFor="name">Naam *</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={initial?.name ?? ""}
            placeholder="e.g. Florists South Holland"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="search_prompt">Search prompt</Label>
          <Textarea
            id="search_prompt"
            name="search_prompt"
            rows={3}
            defaultValue={initial?.search_prompt ?? ""}
            placeholder="Find florists in Germany with a website"
          />
          <p className="text-xs text-muted-foreground">
            Natural language. Later AI can expand this into structured filters.
          </p>
        </div>

        <FilterableCodeChecklist
          label="Countries"
          name="countries"
          required
          options={countryOptions}
          selected={countries}
          onChange={setCountries}
          searchPlaceholder="Search by country or ISO code…"
        />

        <div className="space-y-2">
          <Label htmlFor="regions">Regions / states / provinces</Label>
          <Textarea
            id="regions"
            name="regions"
            rows={3}
            defaultValue={regionsText}
            placeholder={"California\nTexas\nBayern\nVlaanderen\nDubai"}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cities">Cities</Label>
          <Textarea
            id="cities"
            name="cities"
            rows={3}
            defaultValue={citiesText}
            placeholder={"Amsterdam\nLondon\nDubai\nSingapore"}
          />
        </div>

        <FilterableCodeChecklist
          label="Languages"
          name="languages"
          options={languageOptions}
          selected={languages}
          onChange={setLanguages}
          searchPlaceholder="Search by language or ISO code…"
        />

        <div className="space-y-2">
          <Label>Industries</Label>
          <div className="grid max-h-44 grid-cols-1 gap-2 overflow-y-auto rounded-lg border border-border p-3 sm:grid-cols-2">
            {INDUSTRIES.map((industry) => {
              const checked = industries.includes(industry.code);
              return (
                <label
                  key={industry.code}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => {
                      if (value === true && !checked) {
                        setIndustries([...industries, industry.code]);
                      }
                      if (value !== true && checked) {
                        setIndustries(
                          industries.filter((item) => item !== industry.code),
                        );
                      }
                    }}
                  />
                  {industry.labelEn}
                  {checked ? (
                    <input
                      type="hidden"
                      name="industries"
                      value={industry.code}
                    />
                  ) : null}
                </label>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Sources</Label>
          <div className="grid max-h-44 grid-cols-1 gap-2 overflow-y-auto rounded-lg border border-border p-3 sm:grid-cols-2">
            {SOURCES.map((source) => {
              const checked = sources.includes(source.code);
              return (
                <label
                  key={source.code}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => {
                      if (value === true && !checked) {
                        setSources([...sources, source.code]);
                      }
                      if (value !== true && checked) {
                        setSources(
                          sources.filter((item) => item !== source.code),
                        );
                      }
                    }}
                  />
                  {source.labelEn}
                  {checked ? (
                    <input type="hidden" name="sources" value={source.code} />
                  ) : null}
                </label>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="keywords">Keywords *</Label>
          <Textarea
            id="keywords"
            name="keywords"
            required
            rows={4}
            defaultValue={keywordsText}
            placeholder={"florist\nbloemist\nfleuriste"}
          />
          <p className="text-xs text-muted-foreground">
            One keyword per line. Use local-language terms as needed.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="company_size">Company size</Label>
          <select
            id="company_size"
            name="company_size"
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            value={companySize}
            onChange={(event) => setCompanySize(event.target.value)}
          >
            <option value="">Optional</option>
            {COMPANY_SIZE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3 rounded-lg border border-border p-3">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="website_required">Website required</Label>
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
            <Label htmlFor="linkedin_required">LinkedIn required</Label>
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

        {state && !state.success ? (
          <Alert variant="destructive">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}
      </div>

      <SheetFooter className="border-t border-border">
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
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {isEdit ? "Zoekopdracht bewerken" : "Nieuwe zoekopdracht"}
          </SheetTitle>
          <SheetDescription>
            International search criteria (ISO countries & languages). Scraping
            follows in a later phase.
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
