"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { StartScrapeButton } from "@/components/jobs/start-scrape-button";
import { SearchQuerySheet } from "@/components/searches/search-query-sheet";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteSearchQueryAction } from "@/lib/searches/actions";
import type { SearchQueryRow } from "@/lib/searches/queries";

type SearchDetailActionsProps = {
  item: SearchQueryRow;
};

export function SearchDetailActions({ item }: SearchDetailActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleDelete() {
    const result = await deleteSearchQueryAction(item.id);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message);
    setConfirmDelete(false);
    startTransition(() => {
      router.push("/zoekopdrachten");
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <StartScrapeButton searchQueryId={item.id} />
        <Button type="button" variant="outline" onClick={() => setSheetOpen(true)}>
          Bewerken
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={() => setConfirmDelete(true)}
        >
          Verwijderen
        </Button>
        <Button
          nativeButton={false}
          render={<Link href="/zoekopdrachten" />}
          variant="outline"
        >
          Terug
        </Button>
      </div>

      <SearchQuerySheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initial={item}
        onSaved={() => {
          startTransition(() => router.refresh());
        }}
      />

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zoekopdracht verwijderen?</DialogTitle>
            <DialogDescription>
              “{item.name}” wordt permanent verwijderd. Gekoppelde jobs blijven
              bestaan en kunnen verwijderen blokkeren.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Annuleren
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => {
                void handleDelete();
              }}
            >
              Verwijderen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
