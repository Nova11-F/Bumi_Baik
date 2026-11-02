"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useRef } from "react";
import { useFocusTrap } from "@/lib/use-focus-trap";

const links = [
  { href: "/produk", label: "Produk" },
  { href: "/dampak", label: "Dampak" },
  { href: "/keranjang", label: "Keranjang" },
  { href: "/akun", label: "Akun" },
];

type MobileNavProps = {
  open: boolean;
  onClose: () => void;
};

export function MobileNav({ open, onClose }: MobileNavProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(open, panelRef, onClose);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button
        type="button"
        aria-label="Tutup menu"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-ink-900/40"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu navigasi"
        className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col border-l border-paper-200 bg-paper-50 shadow-md"
      >
        <div className="flex h-16 items-center justify-between border-b border-paper-200 px-4">
          <span className="font-display text-xl text-forest-900">Menu</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup menu"
            className="flex h-11 w-11 items-center justify-center rounded-md text-ink-900 hover:bg-paper-100"
          >
            <X className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
        <nav aria-label="Navigasi utama" className="flex flex-col px-4 py-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className="border-b border-paper-200 py-4 text-lg text-ink-900 hover:text-forest-700"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-paper-200 p-4">
          <Link
            href="/masuk"
            onClick={onClose}
            className="flex h-11 items-center justify-center rounded-md bg-forest-700 px-6 font-medium text-paper-50 hover:bg-forest-900"
          >
            Masuk
          </Link>
        </div>
      </div>
    </div>
  );
}
