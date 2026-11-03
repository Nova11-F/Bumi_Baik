"use client";

import Link from "next/link";
import { angka, rupiah } from "@/lib/format";
import { useCart } from "./CartProvider";

export function CartSummary({
  compact = false,
  onContinue,
}: {
  compact?: boolean;
  onContinue?: () => void;
}) {
  const { items, subtotal, totalCo2eKg, totalPlasticAvoidedG, itemCount } =
    useCart();
  const pricesAvailable = items.every((item) => item.product !== null);
  const canCheckout =
    pricesAvailable &&
    items.length > 0 &&
    items.every(
      (item) =>
        item.product !== null &&
        item.product.stock > 0 &&
        item.quantity <= item.product.stock,
    );

  return (
    <aside className="rounded-md border border-paper-200 bg-paper-50 p-5">
      <h2 className="font-display text-xl text-forest-900">
        Ringkasan belanja
      </h2>
      <div className="mt-4 flex justify-between gap-4 text-sm text-ink-600">
        <span>Subtotal ({itemCount} item)</span>
        <span className="font-medium text-ink-900">
          {pricesAvailable ? rupiah(subtotal) : "Belum tersedia"}
        </span>
      </div>

      <section
        aria-labelledby={
          compact ? "drawer-impact-heading" : "cart-impact-heading"
        }
        className="mt-5 border-t border-paper-200 pt-4"
      >
        <h3
          id={compact ? "drawer-impact-heading" : "cart-impact-heading"}
          className="font-medium text-forest-900"
        >
          Dampak belanja ini
        </h3>
        {pricesAvailable ? (
          <>
            <p className="mt-2 font-mono text-sm text-forest-700">
              Estimasi {angka(totalCo2eKg)} kg CO₂e dihindari
            </p>
            {totalPlasticAvoidedG > 0 && (
              <p className="mt-1 font-mono text-sm text-forest-700">
                Estimasi {angka(totalPlasticAvoidedG)} g plastik dihindari
              </p>
            )}
          </>
        ) : (
          <p role="status" className="mt-2 text-sm text-warning">
            Dampak dan harga belum dapat diverifikasi. Muat ulang keranjang.
          </p>
        )}
        <p className="mt-2 text-sm leading-relaxed text-ink-600">
          Angka dampak merupakan estimasi berdasarkan produk di keranjang.
        </p>
      </section>

      <div className="mt-5 border-t border-paper-200 pt-4">
        <p className="flex justify-between gap-4 font-medium text-ink-900">
          <span>Total sementara</span>
          <span>{pricesAvailable ? rupiah(subtotal) : "Belum tersedia"}</span>
        </p>
        <p className="mt-1 text-sm text-ink-600">
          Ongkir dihitung pada langkah checkout.
        </p>
      </div>

      <Link
        href={canCheckout ? "/checkout" : "#"}
        onClick={onContinue}
        aria-disabled={!canCheckout}
        tabIndex={canCheckout ? undefined : -1}
        className={`mt-5 inline-flex h-11 w-full items-center justify-center rounded-md px-6 font-medium ${
          canCheckout
            ? "bg-forest-700 text-paper-50 hover:bg-forest-900"
            : "pointer-events-none cursor-not-allowed bg-paper-200 text-ink-600"
        }`}
      >
        Lanjut ke checkout
      </Link>

      {compact && (
        <Link
          href="/keranjang"
          onClick={onContinue}
          className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-md border border-forest-700 px-6 font-medium text-forest-700 hover:bg-forest-100"
        >
          Lihat keranjang
        </Link>
      )}
    </aside>
  );
}
