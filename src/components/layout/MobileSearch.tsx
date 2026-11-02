"use client";

import { X } from "lucide-react";
import { useRef } from "react";
import { SearchBox } from "@/components/search/SearchBox";
import { useFocusTrap } from "@/lib/use-focus-trap";

type MobileSearchProps = {
  open: boolean;
  onClose: () => void;
};

export function MobileSearch({ open, onClose }: MobileSearchProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(open, panelRef, onClose);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-paper-50 md:hidden">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Pencarian produk"
        className="flex h-full flex-col"
      >
        <div className="flex h-16 items-center gap-2 border-b border-paper-200 px-4">
          <SearchBox variant="mobile" autoFocus onNavigate={onClose} />
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pencarian"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink-900 hover:bg-paper-100"
          >
            <X className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
