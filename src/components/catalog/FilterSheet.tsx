"use client";

import { useRef, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import type { CatalogParams } from "@/lib/catalog-query";
import { countActiveFilters } from "./filter-utils";
import { FilterControls } from "./FilterControls";
import { useFocusTrap } from "@/lib/use-focus-trap";

type FilterSheetProps = {
  params: CatalogParams;
  total: number;
};

export function FilterSheet({ params, total }: FilterSheetProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const activeCount = countActiveFilters(params);

  useFocusTrap(open, panelRef, () => setOpen(false));

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex h-11 items-center gap-2 rounded-md border border-paper-200 bg-paper-50 px-4 font-medium text-forest-700 hover:bg-forest-100"
      >
        <SlidersHorizontal
          className="h-5 w-5"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        Filter{activeCount > 0 ? ` (${activeCount})` : ""}
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Tutup filter"
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full bg-ink-900/40"
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Filter produk"
            className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-md border-t border-paper-200 bg-paper-50 p-4 pb-6"
          >
            <div className="flex items-center justify-between gap-3 border-b border-paper-200 pb-3">
              <h2 className="font-display text-xl text-forest-900">Filter</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup filter"
                className="flex h-11 w-11 items-center justify-center rounded-md text-ink-900 hover:bg-paper-100"
              >
                <X className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
              </button>
            </div>

            <div className="mt-2">
              <FilterControls
                params={params}
                total={total}
                variant="sheet"
                onApplied={() => setOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
