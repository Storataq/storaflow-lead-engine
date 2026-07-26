"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  createSearchQueryAction,
  updateSearchQueryAction,
  type SearchActionResult,
} from "@/lib/searches/actions";
import {
  COMPANY_SIZE_OPTIONS,
  COUNTRY_OPTIONS,
  INDUSTRY_OPTIONS,
  SEARCH_CRITERIA_STATUSES,
} from "@/lib/searches/constants";
import type { SearchQueryRow } from "@/lib/searches/queries";
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
            placeholder="Bijv. Bloemisten Zuid-Holland"
          />
        </div>

        <div className="space-y-2">
          <Label>Landen *</Label>
          <div className="grid max-h-40 grid-cols-1 gap-2 overflow-y-auto rounded-lg border border-border p-3 sm:grid-cols-2">
            {COUNTRY_OPTIONS.map((country) => {
              const checked = countries.includes(country);
              return (
                <label
                  key={country}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => {
                      if (value === true && !checked) {
                        setCountries([...countries, country]);
                      }
                      if (value !== true && checked) {
                        setCountries(
                          countries.filter((item) => item !== country),
                        );
                      }
                    }}
                  />
                  {country}
                  {checked ? (
                    <input type="hidden" name="countries" value={country} />
                  ) : null}
                </label>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Branches</Label>
          <div className="grid max-h-40 grid-cols-1 gap-2 overflow-y-auto rounded-lg border border-border p-3 sm:grid-cols-2">
            {INDUSTRY_OPTIONS.map((industry) => {
              const checked = industries.includes(industry);
              return (
                <label
                  key={industry}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => {
                      if (value === true && !checked) {
                        setIndustries([...industries, industry]);
                      }
                      if (value !== true && checked) {
                        setIndustries(
                          industries.filter((item) => item !== industry),
                        );
                      }
                    }}
                  />
                  {industry}
                  {checked ? (
                    <input type="hidden" name="industries" value={industry} />
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
            placeholder={"bloemist\nbloemenzaak\nbloemistenwinkel"}
          />
          <p className="text-xs text-muted-foreground">
            Eén keyword per regel (of gescheiden door komma).
          </p>
        </div>

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

        <div className="space-y-3 rounded-lg border border-border p-3">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="website_required">Website verplicht</Label>
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
            <Label htmlFor="linkedin_required">LinkedIn verplicht</Label>
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
            Sla zoekcriteria op voor latere scraping. Scraping zelf volgt in
            fase 3.
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
