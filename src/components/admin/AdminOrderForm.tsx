"use client";

import { useActionState } from "react";
import { updateAdminOrderAction } from "@/app/admin/actions";
import { FieldError, FormFeedback } from "@/components/ui/FormFeedback";
import { initialFormState } from "@/lib/validators/common";
import type { OrderStatus } from "@/types";

type AdminOrderFormProps = {
  orderId: string;
  status: OrderStatus;
  trackingNumber: string | null;
};

export function AdminOrderForm({
  orderId,
  status,
  trackingNumber,
}: AdminOrderFormProps) {
  const [state, action, pending] = useActionState(
    updateAdminOrderAction,
    initialFormState,
  );
  const nextStatus =
    status === "paid" ? "shipped" : status === "shipped" ? "completed" : null;

  if (!nextStatus) return <span className="text-sm text-ink-600">—</span>;

  return (
    <form action={action} className="min-w-56 space-y-3">
      <input type="hidden" name="order_id" value={orderId} />
      {(status === "paid" || status === "shipped") && (
        <div>
          <label
            htmlFor={`tracking-${orderId}`}
            className="mb-1 block text-sm font-medium text-ink-900"
          >
            Nomor resi
          </label>
          <input
            id={`tracking-${orderId}`}
            name="tracking_number"
            defaultValue={trackingNumber ?? ""}
            maxLength={100}
            autoComplete="off"
            aria-invalid={Boolean(state.errors?.trackingNumber)}
            aria-describedby={`tracking-error-${orderId}`}
            className="h-11 w-full rounded-md border border-paper-200 bg-white px-3 text-base text-ink-900 focus:border-forest-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700"
          />
          <FieldError
            id={`tracking-error-${orderId}`}
            messages={state.errors?.trackingNumber}
          />
        </div>
      )}
      <input type="hidden" name="status" value={nextStatus} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center justify-center rounded-md border border-forest-700 px-4 font-medium text-forest-700 hover:bg-forest-100 disabled:cursor-not-allowed disabled:border-paper-200 disabled:text-ink-600"
      >
        {pending
          ? "Menyimpan..."
          : nextStatus === "shipped"
            ? "Tandai dikirim"
            : "Tandai selesai"}
      </button>
      <FormFeedback state={state} />
    </form>
  );
}
