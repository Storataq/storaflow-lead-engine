"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PreviewMode = "desktop" | "tablet" | "mobile" | "dark";

type MultiDeviceEmailPreviewProps = {
  subject?: string | null;
  previewText?: string | null;
  html?: string | null;
  text?: string | null;
};

const WIDTHS: Record<Exclude<PreviewMode, "dark">, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "390px",
};

export function MultiDeviceEmailPreview({
  subject,
  previewText,
  html,
  text,
}: MultiDeviceEmailPreviewProps) {
  const [mode, setMode] = useState<PreviewMode>("desktop");
  const isDark = mode === "dark";
  const width = WIDTHS[isDark ? "desktop" : mode];

  const body = useMemo(() => {
    if (html?.trim()) return html;
    if (text?.trim()) {
      return `<pre style="font-family:inherit;white-space:pre-wrap;margin:0">${text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")}</pre>`;
    }
    return "<p style='color:#888'>No email content yet.</p>";
  }, [html, text]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(["desktop", "tablet", "mobile", "dark"] as const).map((m) => (
          <Button
            key={m}
            type="button"
            size="sm"
            variant={mode === m ? "default" : "outline"}
            onClick={() => setMode(m)}
          >
            {m === "dark" ? "Dark mode" : m[0]!.toUpperCase() + m.slice(1)}
          </Button>
        ))}
      </div>
      <div className="space-y-1 text-sm">
        <p>
          <span className="text-muted-foreground">Subject:</span>{" "}
          {subject || "—"}
        </p>
        {previewText ? (
          <p className="text-muted-foreground">{previewText}</p>
        ) : null}
        <Badge variant="outline">{mode}</Badge>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-muted/20 p-3">
        <div
          className={cn(
            "mx-auto overflow-hidden rounded-lg border shadow-sm transition-[max-width]",
            isDark ? "border-zinc-700 bg-zinc-950 text-zinc-100" : "bg-background",
          )}
          style={{ maxWidth: width, width: "100%" }}
        >
          <iframe
            title="Email preview"
            sandbox=""
            className="h-[420px] w-full border-0"
            srcDoc={`<!doctype html><html><head><meta charset="utf-8"/><style>body{margin:16px;font-family:system-ui,sans-serif;${
              isDark ? "background:#09090b;color:#fafafa;" : ""
            }}</style></head><body>${body}</body></html>`}
          />
        </div>
      </div>
    </div>
  );
}
