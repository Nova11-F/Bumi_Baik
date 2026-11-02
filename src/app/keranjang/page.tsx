import type { Metadata } from "next";
import { CartContent } from "@/components/cart/CartContent";

export const metadata: Metadata = {
  title: "Keranjang",
  description: "Periksa produk, subtotal, dan estimasi dampak belanja Anda.",
};

export default function CartPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
      <p className="font-mono text-sm text-forest-700">Belanja Anda</p>
      <h1 className="mt-2 font-display text-[32px] font-semibold leading-[1.1] text-forest-900 sm:text-5xl">
        Keranjang
      </h1>
      <p className="mt-3 max-w-prose text-base leading-relaxed text-ink-600">
        Harga dan stok diperiksa kembali dari katalog terbaru.
      </p>
      <div className="mt-8">
        <CartContent />
      </div>
    </div>
  );
}
