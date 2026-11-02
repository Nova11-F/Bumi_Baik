"use client";

import Link from "next/link";
import { CartItemRow } from "@/components/cart/CartItemRow";
import { CartSummary } from "@/components/cart/CartSummary";
import { useCart } from "@/components/cart/CartProvider";

export function CartContent() {
  const { items, isReady, notice } = useCart();

  if (!isReady) {
    return (
      <p role="status" className="py-12 text-center text-ink-600">
        Memuat keranjang dan memeriksa harga serta stok terbaru…
      </p>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <section aria-label="Produk di keranjang">
        {notice && (
          <p
            role="status"
            className="mb-4 rounded-md border border-warning bg-paper-50 px-4 py-3 text-sm text-ink-900"
          >
            {notice}
          </p>
        )}

        {items.length === 0 ? (
          <div className="border-y border-paper-200 py-12 text-center">
            <h2 className="font-display text-2xl text-forest-900">
              Keranjang masih kosong.
            </h2>
            <p className="mt-2 text-base text-ink-600">
              Pilih produk untuk melihat dampak belanja Anda.
            </p>
            <Link
              href="/produk"
              className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-forest-700 px-6 font-medium text-paper-50 hover:bg-forest-900"
            >
              Lihat semua produk
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-paper-200">
            {items.map((item) => (
              <CartItemRow key={item.productId} item={item} />
            ))}
          </ul>
        )}
      </section>

      {items.length > 0 && (
        <div className="lg:sticky lg:top-24">
          <CartSummary />
        </div>
      )}
    </div>
  );
}
