"use client";

import { useMemo, useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  formatCountryOptionLabel,
  formatIndustryLabel,
  formatLanguageName,
} from "@/lib/international/display";
import { formatSourceLabel } from "@/lib/international/sources";
import { GEO_DISPLAY_LOCALE } from "@/lib/searches/constants";
import { X } from "lucide-react";

type CodeOption = {
  code: string;
  label: string;
};

type FilterableCodeChecklistProps = {
  label: string;
  name: string;
  options: CodeOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  searchPlaceholder: string;
  required?: boolean;
  emptyMessage?: string;
};

export function FilterableCodeChecklist({
  label,
  name,
  options,
  selected,
  onChange,
  searchPlaceholder,
  required = false,
  emptyMessage = "Geen resultaten.",
}: FilterableCodeChecklistProps) {
  const [search, setSearch] = useState("");

  const labelByCode = useMemo(() => {
    return new Map(options.map((option) => [option.code, option.label]));
  }, [options]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return options;
    return options.filter(
      (option) =>
        option.code.toLowerCase().includes(needle) ||
        option.label.toLowerCase().includes(needle),
    );
  }, [options, search]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>
          {label}
          {required ? " *" : ""}
        </Label>
        {selected.length > 0 ? (
          <span className="text-xs text-muted-foreground">
            {selected.length} geselecteerd
          </span>
        ) : null}
      </div>

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((code) => (
            <Badge key={code} variant="secondary" className="gap-1 pr-1">
              <span className="max-w-40 truncate">
                {labelByCode.get(code) ?? code}
              </span>
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-muted"
                aria-label={`Verwijder ${labelByCode.get(code) ?? code}`}
                onClick={() =>
                  onChange(selected.filter((item) => item !== code))
                }
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}

      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={searchPlaceholder}
      />
      <div className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto rounded-lg border border-border p-3 sm:grid-cols-2">
        {filtered.map((option) => {
          const checked = selected.includes(option.code);
          return (
            <label
              key={option.code}
              className="flex items-center gap-2 text-sm"
            >
              <Checkbox
                checked={checked}
                onCheckedChange={(value) => {
                  if (value === true && !checked) {
                    onChange([...selected, option.code]);
                  }
                  if (value !== true && checked) {
                    onChange(selected.filter((item) => item !== option.code));
                  }
                }}
              />
              <span className="truncate">{option.label}</span>
              {checked ? (
                <input type="hidden" name={name} value={option.code} />
              ) : null}
            </label>
          );
        })}
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : null}
      </div>
    </div>
  );
}

export function toCountryOptions(
  countries: { code: string }[],
): CodeOption[] {
  return countries
    .map((country) => ({
      code: country.code,
      label: formatCountryOptionLabel(country.code, GEO_DISPLAY_LOCALE),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, GEO_DISPLAY_LOCALE));
}

export function toLanguageOptions(
  languages: { code: string }[],
): CodeOption[] {
  return languages
    .map((language) => ({
      code: language.code,
      label: formatLanguageName(language.code, GEO_DISPLAY_LOCALE),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, GEO_DISPLAY_LOCALE));
}

export function toIndustryOptions(
  industries: { code: string; labelEn: string }[],
): CodeOption[] {
  return industries
    .map((industry) => ({
      code: industry.code,
      label: formatIndustryLabel(industry.code) || industry.labelEn,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "en"));
}

export function toSourceOptions(
  sources: { code: string; labelEn: string }[],
): CodeOption[] {
  return sources.map((source) => ({
    code: source.code,
    label: formatSourceLabel(source.code) || source.labelEn,
  }));
}
