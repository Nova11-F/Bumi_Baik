"use client";

import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";

export function AddToCartButton({
  productId,
  stock,
}: {
  productId: string;
  stock: number;
}) {
  const { addProduct, isReady } = useCart();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleAdd() {
    setPending(true);
    setMessage(null);
    const result = await addProduct(productId, 1);
    setMessage(result.message ?? null);
    setPending(false);
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void handleAdd()}
        disabled={stock === 0 || !isReady || pending}
        className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md bg-forest-700 px-6 font-medium text-paper-50 hover:bg-forest-900 disabled:cursor-not-allowed disabled:bg-paper-200 disabled:text-ink-400"
      >
        {stock === 0
          ? "Stok habis"
          : pending || !isReady
            ? "Memproses…"
            : "Tambah ke keranjang"}
      </button>
      {message && (
        <p
          role="status"
          className={`mt-2 text-sm ${
            message.includes("berhasil") || message.includes("ditambahkan")
              ? "text-forest-700"
              : "text-warning"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
