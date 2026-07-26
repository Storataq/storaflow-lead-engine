"use client";

import { useMemo, useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatCountryOptionLabel,
  formatLanguageName,
} from "@/lib/international/display";
import { GEO_DISPLAY_LOCALE } from "@/lib/searches/constants";

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
};

export function FilterableCodeChecklist({
  label,
  name,
  options,
  selected,
  onChange,
  searchPlaceholder,
  required = false,
}: FilterableCodeChecklistProps) {
  const [search, setSearch] = useState("");

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
      <Label>
        {label}
        {required ? " *" : ""}
      </Label>
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={searchPlaceholder}
      />
      <div className="grid max-h-44 grid-cols-1 gap-2 overflow-y-auto rounded-lg border border-border p-3 sm:grid-cols-2">
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
          <p className="text-sm text-muted-foreground">Geen resultaten.</p>
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
