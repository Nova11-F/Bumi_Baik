"use client";

import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";

export function AddToCartButton({
  productId,
  productName,
  stock,
}: {
  productId: string;
  productName: string;
  stock: number;
}) {
  const { addProduct, isReady } = useCart();
  const [pending, setPending] = useState(false);
  const [added, setAdded] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    success: boolean;
  } | null>(null);
  const addedTimeout = useRef<number | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4_000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(
    () => () => {
      if (addedTimeout.current !== null) {
        window.clearTimeout(addedTimeout.current);
      }
    },
    [],
  );

  async function handleAdd() {
    if (pending) return;
    setPending(true);
    setToast(null);

    try {
      const result = await addProduct(productId, 1);
      if (!result.ok) {
        setToast({
          message: result.message ?? "Produk belum berhasil ditambahkan.",
          success: false,
        });
        return;
      }

      setAdded(true);
      if (addedTimeout.current !== null) {
        window.clearTimeout(addedTimeout.current);
      }
      addedTimeout.current = window.setTimeout(() => setAdded(false), 1_500);
      setToast({ message: `${productName} ditambahkan`, success: true });
    } catch (error) {
      console.error("Produk belum berhasil ditambahkan ke keranjang.", error);
      setToast({
        message: "Produk belum berhasil ditambahkan. Coba lagi.",
        success: false,
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void handleAdd()}
        disabled={stock === 0 || !isReady || pending}
        className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-forest-700 px-6 font-medium text-paper-50 hover:bg-forest-900 disabled:cursor-not-allowed disabled:bg-paper-200 disabled:text-ink-400"
      >
        {stock === 0 ? (
          "Stok habis"
        ) : pending || !isReady ? (
          <>
            <LoaderCircle
              className="h-4 w-4 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
            Memproses…
          </>
        ) : added ? (
          "Ditambahkan"
        ) : (
          "Tambah ke keranjang"
        )}
      </button>
      {toast && (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={`fixed inset-x-4 top-20 z-[60] rounded-md border bg-paper-50 p-4 shadow-md sm:inset-x-auto sm:bottom-6 sm:right-6 sm:top-auto sm:w-96 ${
            toast.success
              ? "border-forest-500 text-forest-900"
              : "border-danger text-danger"
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <p className="min-w-0 text-sm font-medium">{toast.message}</p>
            {toast.success && (
              <Link
                href="/keranjang"
                onClick={() => setToast(null)}
                className="min-h-11 shrink-0 self-center text-sm font-medium text-forest-700 underline underline-offset-4"
              >
                Lihat keranjang
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
