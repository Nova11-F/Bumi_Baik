"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { ProductImage } from "@/components/product/ProductImage";
import {
  useCartActions,
  type CartDisplayItem,
} from "@/components/cart/CartProvider";
import { rupiah } from "@/lib/format";

export function CartItemRow({
  item,
  compact = false,
}: {
  item: CartDisplayItem;
  compact?: boolean;
}) {
  const { changeQuantity, deleteItem } = useCartActions();
  const product = item.product;
  const unavailable = !product || product.stock === 0;
  const stockWarning =
    product && item.quantity > product.stock
      ? `Jumlah di keranjang ${item.quantity}, sedangkan stok terbaru ${product.stock}.`
      : product?.stock === 0
        ? "Stok produk habis."
        : !product
          ? "Produk ini sudah tidak tersedia."
          : null;

  return (
    <li className="flex gap-4 border-b border-paper-200 py-4 last:border-b-0">
      <div
        className={`relative shrink-0 overflow-hidden rounded-md bg-paper-100 ${
          compact ? "h-20 w-16" : "h-28 w-24"
        }`}
      >
        {product && (
          <ProductImage
            src={product.images[0]}
            name={product.name}
            sizes={compact ? "64px" : "96px"}
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-lg leading-snug text-forest-900">
              {product?.name ?? "Produk tidak tersedia"}
            </h3>
            {product && (
              <p className="mt-1 text-sm font-medium text-ink-900">
                {rupiah(product.price_idr)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void deleteItem(item.productId)}
            aria-label={`Hapus ${product?.name ?? "produk"} dari keranjang`}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink-600 hover:bg-paper-100 hover:text-danger"
          >
            <Trash2 className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>

        {stockWarning && (
          <p role="status" className="mt-2 text-sm text-warning">
            {stockWarning}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between gap-3">
          <div
            className="inline-flex items-center rounded-md border border-paper-200"
            aria-label="Ubah jumlah"
          >
            <button
              type="button"
              onClick={() =>
                void changeQuantity(item.productId, item.quantity - 1)
              }
              disabled={item.quantity <= 1 || !product}
              aria-label="Kurangi jumlah"
              className="flex h-11 w-11 items-center justify-center rounded-l-md text-ink-900 hover:bg-paper-100 disabled:cursor-not-allowed disabled:text-ink-600"
            >
              <Minus className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            </button>
            <span
              className="min-w-10 text-center font-mono text-sm"
              aria-live="polite"
            >
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() =>
                void changeQuantity(item.productId, item.quantity + 1)
              }
              disabled={
                unavailable ||
                !product ||
                item.quantity >= Math.min(product.stock, 99)
              }
              aria-label="Tambah jumlah"
              className="flex h-11 w-11 items-center justify-center rounded-r-md text-ink-900 hover:bg-paper-100 disabled:cursor-not-allowed disabled:text-ink-600"
            >
              <Plus className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>
          {!compact && product && (
            <p className="text-right font-medium text-ink-900">
              {rupiah(product.price_idr * item.quantity)}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}
