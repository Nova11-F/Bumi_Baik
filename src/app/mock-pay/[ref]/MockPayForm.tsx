"use client";

import { useActionState } from "react";
import { initialFormState } from "@/lib/validators/common";
import { submitMockPayment } from "./actions";

export function MockPayForm({ ref }: { ref: string }) {
  const [state, formAction, pending] = useActionState(
    submitMockPayment,
    initialFormState,
  );

  return (
    <form action={formAction} className="mt-6 space-y-3">
      <input type="hidden" name="ref" value={ref} />
      {state.status === "error" && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        name="status"
        value="paid"
        disabled={pending}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-forest-700 px-6 font-medium text-paper-50 hover:bg-forest-900 disabled:cursor-not-allowed disabled:bg-paper-200 disabled:text-ink-400"
      >
        {pending ? "Memproses..." : "Berhasil"}
      </button>
      <button
        type="submit"
        name="status"
        value="failed"
        disabled={pending}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-forest-700 px-6 font-medium text-forest-700 hover:bg-forest-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Gagal
      </button>
    </form>
  );
}
