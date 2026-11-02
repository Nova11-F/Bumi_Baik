import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Leaf } from "lucide-react";
import { ProductGrid } from "@/components/product/ProductGrid";
import { getProductsPage, parseCatalogPage } from "@/lib/catalog-query";
import { PRODUCTS_PER_PAGE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Katalog Produk",
  description:
    "Jelajahi produk sehari-hari dengan estimasi dampak iklim, tag SDG, dan harga yang jelas.",
};

type ProdukPageProps = {
  searchParams: Promise<{ hal?: string | string[] }>;
};

export default async function ProdukPage({ searchParams }: ProdukPageProps) {
  const params = await searchParams;
  const page = parseCatalogPage(params.hal);
  const { products, total, pageCount } = await getProductsPage(page);
  const start = total === 0 ? 0 : (page - 1) * PRODUCTS_PER_PAGE + 1;
  const end = Math.min(page * PRODUCTS_PER_PAGE, total);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-ink-600">
        <Link href="/" className="hover:text-forest-700">
          Beranda
        </Link>
        <ChevronRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        <span aria-current="page" className="text-ink-900">
          Produk
        </span>
      </nav>

      <div className="mt-6 flex flex-col gap-3 border-b border-paper-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-[32px] font-semibold leading-[1.1] text-forest-900 lg:text-5xl">
            Semua produk
          </h1>
          <p className="mt-2 text-base text-ink-600">
            {total > 0
              ? `Menampilkan ${start}–${end} dari ${total} produk aktif`
              : "Belum ada produk aktif saat ini"}
          </p>
        </div>
      </div>

      {products.length > 0 ? (
        <div className="mt-8">
          <ProductGrid products={products} priorityCount={4} />
        </div>
      ) : (
        <div className="mt-12 flex flex-col items-center rounded-md border border-paper-200 bg-paper-100 px-6 py-16 text-center">
          <Leaf className="h-8 w-8 text-forest-500" strokeWidth={1.5} aria-hidden="true" />
          <h2 className="mt-4 font-display text-2xl text-forest-900">
            Halaman ini belum berisi produk
          </h2>
          <p className="mt-2 max-w-md text-base text-ink-600">
            Kembali ke halaman pertama untuk melihat seluruh katalog yang tersedia.
          </p>
          <Link
            href="/produk"
            className="mt-6 inline-flex h-11 items-center rounded-md bg-forest-700 px-6 font-medium text-paper-50 hover:bg-forest-900"
          >
            Ke halaman pertama
          </Link>
        </div>
      )}

      {total > 0 && pageCount > 1 && (
        <nav
          aria-label="Paginasi katalog"
          className="mt-12 flex items-center justify-between border-t border-paper-200 pt-6"
        >
          {page > 1 ? (
            <Link
              href={`/produk?hal=${page - 1}`}
              className="inline-flex h-11 items-center rounded-md border border-forest-700 px-4 font-medium text-forest-700 hover:bg-forest-100"
            >
              Sebelumnya
            </Link>
          ) : (
            <span className="inline-flex h-11 cursor-not-allowed items-center rounded-md bg-paper-200 px-4 font-medium text-ink-400">
              Sebelumnya
            </span>
          )}

          <p className="font-mono text-sm text-ink-600">
            Halaman {page} dari {pageCount}
          </p>

          {page < pageCount ? (
            <Link
              href={`/produk?hal=${page + 1}`}
              className="inline-flex h-11 items-center rounded-md border border-forest-700 px-4 font-medium text-forest-700 hover:bg-forest-100"
            >
              Berikutnya
            </Link>
          ) : (
            <span className="inline-flex h-11 cursor-not-allowed items-center rounded-md bg-paper-200 px-4 font-medium text-ink-400">
              Berikutnya
            </span>
          )}
        </nav>
      )}
    </div>
  );
}
