"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page rendering failed", {
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <section className="mx-auto flex min-h-[50vh] max-w-3xl flex-col items-start justify-center px-4 py-16 sm:px-6">
      <TriangleAlert
        className="h-8 w-8 text-danger"
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <p className="mt-5 font-mono text-sm text-forest-700">Gangguan halaman</p>
      <h1 className="mt-2 font-display text-[32px] font-semibold leading-[1.1] text-forest-900 sm:text-5xl">
        Halaman belum berhasil dimuat
      </h1>
      <p className="mt-4 max-w-prose text-base leading-relaxed text-ink-600">
        Data tidak berubah. Coba muat ulang halaman; jika masalah berlanjut,
        silakan kembali lagi nanti.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-7 inline-flex min-h-11 items-center justify-center rounded-md bg-forest-700 px-6 font-medium text-paper-50 hover:bg-forest-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700"
      >
        Coba lagi
      </button>
    </section>
  );
}
