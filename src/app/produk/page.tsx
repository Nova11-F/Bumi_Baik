import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Leaf, Search } from "lucide-react";
import { ActiveChips } from "@/components/catalog/ActiveChips";
import { CatalogNavigation } from "@/components/catalog/CatalogNavigation";
import { CatalogPageLink } from "@/components/catalog/CatalogPageLink";
import { FilterSheet } from "@/components/catalog/FilterSheet";
import { FilterSidebar } from "@/components/catalog/FilterSidebar";
import {
  buildCatalogHref,
  hasActiveFilters,
} from "@/components/catalog/filter-utils";
import { SortSelect } from "@/components/catalog/SortSelect";
import { ProductGrid } from "@/components/product/ProductGrid";
import {
  parseCatalogParams,
  queryProducts,
  type CatalogSearchParams,
} from "@/lib/catalog-query";
import { PRODUCTS_PER_PAGE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Katalog Produk",
  description:
    "Jelajahi produk sehari-hari dengan estimasi dampak iklim, tag SDG, dan harga yang jelas.",
};

type ProdukPageProps = {
  searchParams: Promise<CatalogSearchParams>;
};

export default async function ProdukPage({ searchParams }: ProdukPageProps) {
  const params = parseCatalogParams(await searchParams);
  const { products, total, page, pageCount } = await queryProducts(params);
  const start = total === 0 ? 0 : (page - 1) * PRODUCTS_PER_PAGE + 1;
  const end = Math.min(page * PRODUCTS_PER_PAGE, total);
  const filtered = hasActiveFilters(params) || Boolean(params.q);
  const firstPageHref = buildCatalogHref({ ...params, hal: 1 });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1 text-sm text-ink-600"
      >
        <Link
          href="/"
          className="inline-flex min-h-11 items-center hover:text-forest-700"
        >
          Beranda
        </Link>
        <ChevronRight
          className="h-4 w-4"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <span aria-current="page" className="text-ink-900">
          Produk
        </span>
      </nav>

      <div className="mt-6 border-b border-paper-200 pb-6">
        <h1 className="font-display text-[32px] font-semibold leading-[1.1] text-forest-900 lg:text-5xl">
          {params.q ? `Hasil untuk “${params.q}”` : "Semua produk"}
        </h1>
        <p className="mt-2 text-base text-ink-600">
          {total > 0
            ? `Menampilkan ${start}–${end} dari ${total} produk aktif`
            : filtered
              ? "Tidak ada produk yang cocok dengan pencarian dan filter ini"
              : "Belum ada produk aktif saat ini"}
        </p>
      </div>

      <CatalogNavigation>
        <div className="mt-8 lg:flex lg:items-start lg:gap-10">
          <FilterSidebar params={params} total={total} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <FilterSheet params={params} total={total} />
              <div className="ml-auto">
                <SortSelect params={params} />
              </div>
            </div>

            <div className="mt-4">
              <ActiveChips params={params} />
            </div>

            {products.length > 0 ? (
              <div className="mt-6">
                <ProductGrid products={products} priorityCount={4} />
              </div>
            ) : total > 0 ? (
              <div className="mt-12 flex flex-col items-center rounded-md border border-paper-200 bg-paper-100 px-6 py-16 text-center">
                <Leaf
                  className="h-8 w-8 text-forest-500"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <h2 className="mt-4 font-display text-2xl text-forest-900">
                  Halaman ini belum berisi produk
                </h2>
                <p className="mt-2 max-w-md text-base text-ink-600">
                  Kembali ke halaman pertama untuk melihat produk yang sesuai
                  dengan filter ini.
                </p>
                <Link
                  href={firstPageHref}
                  className="mt-6 inline-flex h-11 items-center rounded-md bg-forest-700 px-6 font-medium text-paper-50 hover:bg-forest-900"
                >
                  Ke halaman pertama
                </Link>
              </div>
            ) : filtered ? (
              <div className="mt-12 flex flex-col items-center rounded-md border border-paper-200 bg-paper-100 px-6 py-16 text-center">
                <Search
                  className="h-8 w-8 text-forest-500"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <h2 className="mt-4 font-display text-2xl text-forest-900">
                  Tidak ada produk yang cocok
                </h2>
                <p className="mt-2 max-w-md text-base text-ink-600">
                  Coba kata kunci lain, kurangi kategori atau SDG yang dipilih,
                  atau longgarkan rentang harga.
                </p>
                <Link
                  href="/produk"
                  className="mt-6 inline-flex h-11 items-center rounded-md bg-forest-700 px-6 font-medium text-paper-50 hover:bg-forest-900"
                >
                  Hapus semua filter
                </Link>
              </div>
            ) : (
              <div className="mt-12 flex flex-col items-center rounded-md border border-paper-200 bg-paper-100 px-6 py-16 text-center">
                <Leaf
                  className="h-8 w-8 text-forest-500"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <h2 className="mt-4 font-display text-2xl text-forest-900">
                  Katalog masih kosong
                </h2>
                <p className="mt-2 max-w-md text-base text-ink-600">
                  Katalog belum memiliki produk aktif. Kembali ke beranda untuk
                  melihat informasi Bumi Baik.
                </p>
                <Link
                  href="/"
                  className="mt-6 inline-flex h-11 items-center rounded-md bg-forest-700 px-6 font-medium text-paper-50 hover:bg-forest-900"
                >
                  Kembali ke beranda
                </Link>
              </div>
            )}

            {total > 0 && pageCount > 1 && (
              <nav
                aria-label="Paginasi katalog"
                className="mt-12 flex items-center justify-between border-t border-paper-200 pt-6"
              >
                {page > 1 ? (
                  <CatalogPageLink
                    href={buildCatalogHref({ ...params, hal: page - 1 })}
                    className="inline-flex h-11 items-center rounded-md border border-forest-700 px-4 font-medium text-forest-700 hover:bg-forest-100"
                  >
                    Sebelumnya
                  </CatalogPageLink>
                ) : (
                  <span className="inline-flex h-11 cursor-not-allowed items-center rounded-md bg-paper-200 px-4 font-medium text-ink-600">
                    Sebelumnya
                  </span>
                )}

                <p className="font-mono text-sm text-ink-600">
                  Halaman {page} dari {pageCount}
                </p>

                {page < pageCount ? (
                  <CatalogPageLink
                    href={buildCatalogHref({ ...params, hal: page + 1 })}
                    className="inline-flex h-11 items-center rounded-md border border-forest-700 px-4 font-medium text-forest-700 hover:bg-forest-100"
                  >
                    Berikutnya
                  </CatalogPageLink>
                ) : (
                  <span className="inline-flex h-11 cursor-not-allowed items-center rounded-md bg-paper-200 px-4 font-medium text-ink-600">
                    Berikutnya
                  </span>
                )}
              </nav>
            )}
          </div>
        </div>
      </CatalogNavigation>
    </div>
  );
}
