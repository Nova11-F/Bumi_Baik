"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useRef } from "react";
import { CartItemRow } from "@/components/cart/CartItemRow";
import { CartSummary } from "@/components/cart/CartSummary";
import { useCartDrawer, useCartItems } from "@/components/cart/CartProvider";
import { useFocusTrap } from "@/lib/use-focus-trap";

export function CartDrawer() {
  const { items, isReady } = useCartItems();
  const { isDrawerOpen, notice, setDrawerOpen } = useCartDrawer();
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(isDrawerOpen, panelRef, () => setDrawerOpen(false));

  if (!isDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Tutup keranjang"
        tabIndex={-1}
        onClick={() => setDrawerOpen(false)}
        className="absolute inset-0 h-full w-full cursor-default bg-ink-900/40"
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-heading"
        className="absolute right-0 top-0 flex h-full w-full max-w-[420px] flex-col border-l border-paper-200 bg-paper-50 shadow-md"
      >
        <header className="flex min-h-16 items-center justify-between border-b border-paper-200 px-5">
          <h2
            id="cart-drawer-heading"
            className="font-display text-2xl text-forest-900"
          >
            Keranjang
          </h2>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Tutup keranjang"
            className="flex h-11 w-11 items-center justify-center rounded-md text-ink-900 hover:bg-paper-100"
          >
            <X className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
          </button>
        </header>

        {notice && (
          <p role="status" className="mx-5 mt-4 text-sm text-forest-700">
            {notice}
          </p>
        )}

        {!isReady ? (
          <p role="status" className="p-5 text-sm text-ink-600">
            Memuat keranjang…
          </p>
        ) : items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <p className="font-display text-xl text-forest-900">
              Keranjang masih kosong.
            </p>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-600">
              Tambahkan produk dari katalog untuk melihat ringkasan belanja Anda
              di sini.
            </p>
            <Link
              href="/produk"
              onClick={() => setDrawerOpen(false)}
              className="mt-4 inline-flex h-11 items-center justify-center rounded-md bg-forest-700 px-6 font-medium text-paper-50 hover:bg-forest-900"
            >
              Lihat produk
            </Link>
          </div>
        ) : (
          <>
            <ul className="min-h-0 flex-1 overflow-y-auto px-5">
              {items.map((item) => (
                <CartItemRow key={item.productId} item={item} compact />
              ))}
            </ul>
            <div className="max-h-[48%] overflow-y-auto border-t border-paper-200 p-5">
              <CartSummary compact onContinue={() => setDrawerOpen(false)} />
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
