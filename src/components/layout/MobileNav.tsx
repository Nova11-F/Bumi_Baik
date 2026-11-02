"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useRef } from "react";
import { SignOutForm } from "@/components/account/SignOutForm";
import { useFocusTrap } from "@/lib/use-focus-trap";
import type { HeaderAccount } from "./HeaderClient";

type MobileNavProps = {
  open: boolean;
  onClose: () => void;
  pathname: string;
  account: HeaderAccount | null;
};

const links = [
  { href: "/", label: "Beranda" },
  { href: "/produk", label: "Produk" },
  { href: "/dampak", label: "Dampak" },
  { href: "/keranjang", label: "Keranjang" },
];

function isCurrentPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNav({
  open,
  onClose,
  pathname,
  account,
}: MobileNavProps) {
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
        className="absolute inset-0 flex h-full w-full flex-col border-l border-paper-200 bg-paper-50 shadow-md"
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
              aria-current={
                isCurrentPath(pathname, link.href) ? "page" : undefined
              }
              onClick={onClose}
              className={`flex min-h-11 items-center border-b border-paper-200 text-lg underline-offset-4 hover:text-forest-700 hover:underline hover:decoration-forest-700 hover:decoration-2 ${
                isCurrentPath(pathname, link.href)
                  ? "text-forest-700 underline decoration-forest-700 decoration-2"
                  : "text-ink-900"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {account ? (
            <>
              <p className="border-b border-paper-200 py-3 text-sm text-ink-600">
                {account.name}
              </p>
              {[
                { href: "/akun", label: "Akun" },
                { href: "/pesanan", label: "Pesanan" },
                ...(account.isAdmin
                  ? [{ href: "/admin", label: "Admin" }]
                  : []),
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={
                    isCurrentPath(pathname, link.href) ? "page" : undefined
                  }
                  onClick={onClose}
                  className={`flex min-h-11 items-center border-b border-paper-200 underline-offset-4 hover:text-forest-700 hover:underline hover:decoration-forest-700 hover:decoration-2 ${
                    isCurrentPath(pathname, link.href)
                      ? "text-forest-700 underline decoration-forest-700 decoration-2"
                      : "text-ink-900"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </>
          ) : (
            <Link
              href="/masuk"
              aria-current={pathname === "/masuk" ? "page" : undefined}
              onClick={onClose}
              className={`flex min-h-11 items-center border-b border-paper-200 underline-offset-4 hover:text-forest-700 hover:underline hover:decoration-forest-700 hover:decoration-2 ${
                pathname === "/masuk"
                  ? "text-forest-700 underline decoration-forest-700 decoration-2"
                  : "text-ink-900"
              }`}
            >
              Masuk
            </Link>
          )}
        </nav>
        {account && (
          <div className="mt-auto border-t border-paper-200 p-4">
            <SignOutForm onClick={onClose} />
          </div>
        )}
      </div>
    </div>
  );
}
