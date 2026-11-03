import Link from "next/link";
import { Leaf } from "lucide-react";

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[50vh] max-w-3xl flex-col items-start justify-center px-4 py-16 sm:px-6">
      <Leaf
        className="h-8 w-8 text-forest-500"
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <p className="mt-5 font-mono text-sm text-forest-700">
        404 / Tidak ditemukan
      </p>
      <h1 className="mt-2 font-display text-[32px] font-semibold leading-[1.1] text-forest-900 sm:text-5xl">
        Halaman ini tidak tersedia
      </h1>
      <p className="mt-4 max-w-prose text-base leading-relaxed text-ink-600">
        Tautan mungkin sudah berubah atau alamat yang dimasukkan tidak tepat.
      </p>
      <Link
        href="/"
        className="mt-7 inline-flex min-h-11 items-center justify-center rounded-md bg-forest-700 px-6 font-medium text-paper-50 hover:bg-forest-900"
      >
        Kembali ke beranda
      </Link>
    </section>
  );
}
