"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import {
  bulkResearchProspectsAction,
  exportProspectsAction,
  importProspectsJsonAction,
} from "@/lib/prospecting/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ProspectBulkBar({
  selectedIds,
}: {
  selectedIds: string[];
}) {
  const [pending, startTransition] = useTransition();
  const [importJson, setImportJson] = useState(
    '[{"companyName":"Example BV","websiteUrl":"https://example.com","country":"NL"}]',
  );

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={pending || selectedIds.length === 0}
          onClick={() =>
            startTransition(async () => {
              const r = await bulkResearchProspectsAction(selectedIds);
              if (r.success) toast.success(r.message);
              else toast.error(r.message);
            })
          }
        >
          Bulk analyze ({selectedIds.length})
        </Button>
        {(["csv", "excel", "json", "pdf"] as const).map((format) => (
          <Button
            key={format}
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await exportProspectsAction({ format });
                if (!r.success || !r.payload) {
                  toast.error(r.message);
                  return;
                }
                download(
                  r.filename ?? `prospects.${format}`,
                  r.payload,
                  r.mimeType ?? "text/plain",
                );
                toast.success(`Exported ${format.toUpperCase()}`);
              })
            }
          >
            Export {format.toUpperCase()}
          </Button>
        ))}
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Import JSON</p>
        <Textarea
          rows={4}
          value={importJson}
          onChange={(e) => setImportJson(e.target.value)}
        />
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await importProspectsJsonAction(importJson);
              if (r.success) toast.success(r.message);
              else toast.error(r.message);
            })
          }
        >
          Import
        </Button>
      </div>
    </div>
  );
}
