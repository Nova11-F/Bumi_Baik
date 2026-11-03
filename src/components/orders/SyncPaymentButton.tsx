"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export function SyncPaymentButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sync() {
    setPending(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/orders/${orderId}/sync-payment`, {
        method: "POST",
      });
      const result = (await response.json()) as {
        result?: string;
        eventStatus?: string;
        error?: { message?: string };
      };

      if (!response.ok) {
        if (response.status === 409) {
          setError("Pembayaran sedang diproses, coba lagi sebentar");
        } else if (response.status === 429) {
          const retryAfter = Number(response.headers.get("Retry-After"));
          setError(
            Number.isFinite(retryAfter) && retryAfter > 0
              ? `Terlalu sering memeriksa. Coba lagi dalam ${retryAfter} detik.`
              : "Penyedia pembayaran sedang sibuk. Coba lagi nanti.",
          );
        } else if (response.status >= 500) {
          setError("Status pembayaran belum berhasil diperbarui. Coba lagi.");
        } else {
          setError(
            result.error?.message ??
              "Status pembayaran belum berhasil diperiksa.",
          );
        }
        return;
      }

      setMessage(
        result.eventStatus === "pending"
          ? "Pembayaran masih menunggu konfirmasi."
          : result.result === "processed"
            ? "Status pembayaran sudah diperbarui."
            : "Belum ada perubahan status pembayaran.",
      );
      router.refresh();
    } catch {
      setError("Koneksi terputus. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={sync}
        disabled={pending}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-forest-700 px-6 font-medium text-forest-700 hover:bg-forest-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RefreshCw
          className={`h-5 w-5 ${pending ? "animate-spin" : ""}`}
          aria-hidden="true"
        />
        {pending ? "Memeriksa..." : "Cek status pembayaran"}
      </button>
      {message && (
        <p role="status" className="mt-2 text-sm text-forest-700">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
