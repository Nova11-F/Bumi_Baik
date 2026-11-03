"use client";

import { useActionState } from "react";
import { updateAdminProductAction } from "@/app/admin/actions";
import { FieldError, FormFeedback } from "@/components/ui/FormFeedback";
import { initialFormState } from "@/lib/validators/common";

export function AdminProductForm({
  productId,
  priceIdr,
  stock,
}: {
  productId: string;
  priceIdr: number;
  stock: number;
}) {
  const [state, action, pending] = useActionState(
    updateAdminProductAction,
    initialFormState,
  );

  return (
    <form action={action} className="grid min-w-[22rem] gap-3 sm:grid-cols-3">
      <input type="hidden" name="product_id" value={productId} />
      <div>
        <label
          htmlFor={`price-${productId}`}
          className="mb-1 block text-sm font-medium text-ink-900"
        >
          Harga (Rp)
        </label>
        <input
          id={`price-${productId}`}
          name="price_idr"
          type="number"
          min={1}
          max={2_000_000_000}
          step={1}
          required
          defaultValue={priceIdr}
          aria-invalid={Boolean(state.errors?.priceIdr)}
          aria-describedby={`price-error-${productId}`}
          className="h-11 w-full rounded-md border border-paper-200 bg-white px-3 text-base text-ink-900 focus:border-forest-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700"
        />
        <FieldError
          id={`price-error-${productId}`}
          messages={state.errors?.priceIdr}
        />
      </div>
      <div>
        <label
          htmlFor={`stock-${productId}`}
          className="mb-1 block text-sm font-medium text-ink-900"
        >
          Stok
        </label>
        <input
          id={`stock-${productId}`}
          name="stock"
          type="number"
          min={0}
          max={1_000_000}
          step={1}
          required
          defaultValue={stock}
          aria-invalid={Boolean(state.errors?.stock)}
          aria-describedby={`stock-error-${productId}`}
          className="h-11 w-full rounded-md border border-paper-200 bg-white px-3 text-base text-ink-900 focus:border-forest-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700"
        />
        <FieldError
          id={`stock-error-${productId}`}
          messages={state.errors?.stock}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-forest-700 px-4 font-medium text-paper-50 hover:bg-forest-900 disabled:cursor-not-allowed disabled:bg-paper-200 disabled:text-ink-600 sm:mt-0"
      >
        {pending ? "Menyimpan..." : "Simpan"}
      </button>
      <div className="sm:col-span-3">
        <FormFeedback state={state} />
      </div>
    </form>
  );
}
