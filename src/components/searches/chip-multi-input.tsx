"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ChipMultiInputProps = {
  label: string;
  name: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  required?: boolean;
  hint?: string;
};

function dedupeAppend(values: string[], candidate: string): string[] {
  const trimmed = candidate.trim();
  if (!trimmed) return values;
  const exists = values.some(
    (value) => value.toLowerCase() === trimmed.toLowerCase(),
  );
  if (exists) return values;
  return [...values, trimmed];
}

/**
 * Multi-value text input with removable chips.
 * Enter / comma adds a value; duplicates and blanks are ignored.
 */
export function ChipMultiInput({
  label,
  name,
  values,
  onChange,
  placeholder,
  required = false,
  hint,
}: ChipMultiInputProps) {
  const [draft, setDraft] = useState("");

  function commitDraft() {
    const next = dedupeAppend(values, draft);
    if (next !== values) onChange(next);
    setDraft("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commitDraft();
      return;
    }
    if (event.key === "Backspace" && draft.length === 0 && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required ? " *" : ""}
      </Label>

      {values.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {values.map((value) => (
            <Badge key={value} variant="secondary" className="gap-1 pr-1">
              <span className="max-w-[14rem] break-words whitespace-normal">
                {value}
              </span>
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-muted"
                aria-label={`Verwijder ${value}`}
                onClick={() =>
                  onChange(values.filter((item) => item !== value))
                }
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}

      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commitDraft}
        placeholder={placeholder}
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}

      {values.map((value) => (
        <input key={`${name}-${value}`} type="hidden" name={name} value={value} />
      ))}
    </div>
  );
}
