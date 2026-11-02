import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Gallery } from "@/components/product/Gallery";
import { ImpactPanel } from "@/components/product/ImpactPanel";
import { ProductGrid } from "@/components/product/ProductGrid";
import { SdgTag } from "@/components/product/SdgTag";
import { getProductBySlug, getRelatedProducts } from "@/lib/catalog-query";
import { FREE_SHIPPING_MIN_IDR, SHIPPING_ZONES } from "@/lib/constants";
import { angka, co2e as formatCo2e, rupiah } from "@/lib/format";
import { isUsableImageUrl } from "@/lib/product";
import { getStockStatus, stockLabel } from "@/lib/stock";

type ProductDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return { title: "Produk tidak ditemukan" };
  }

  const description = product.impact_note ?? product.description.slice(0, 155);
  const image = product.images.find(isUsableImageUrl);

  return {
    title: product.name,
    description,
    alternates: { canonical: `/produk/${product.slug}` },
    openGraph: {
      title: product.name,
      description,
      type: "website",
      images: image ? [{ url: image, alt: `Foto ${product.name}` }] : undefined,
    },
  };
}

function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const relatedProducts = await getRelatedProducts(product.category_id, product.id);
  const stockStatus = getStockStatus(product.stock);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.slug,
    category: product.categories?.name,
    image: product.images.filter(isUsableImageUrl),
    brand: { "@type": "Brand", name: "Bumi Baik" },
    offers: {
      "@type": "Offer",
      priceCurrency: "IDR",
      price: product.price_idr,
      availability:
        product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${siteUrl}/produk/${product.slug}`,
    },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 items-center gap-1 text-sm text-ink-600"
      >
        <Link href="/" className="shrink-0 hover:text-forest-700">
          Beranda
        </Link>
        <ChevronRight className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
        <Link href="/produk" className="shrink-0 hover:text-forest-700">
          Produk
        </Link>
        <ChevronRight className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
        <span aria-current="page" className="truncate text-ink-900">
          {product.name}
        </span>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-7">
          <Gallery images={product.images} name={product.name} />
        </div>

        <div className="lg:col-span-5">
          <p className="text-sm uppercase tracking-wide text-ink-600">
            {product.categories?.name ?? "Produk"}
          </p>

          <h1 className="mt-2 font-display text-[32px] font-semibold leading-[1.1] text-forest-900 lg:text-5xl">
            {product.name}
          </h1>

          {product.sdg_goals.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-sm text-ink-600">SDG terkait</span>
              {product.sdg_goals.map((goal) => (
                <SdgTag key={goal} goal={goal} />
              ))}
            </div>
          )}

          <p className="mt-5 text-2xl font-semibold text-ink-900">{rupiah(product.price_idr)}</p>

          <p
            className={`mt-2 text-sm font-medium ${
              stockStatus === "habis"
                ? "text-danger"
                : stockStatus === "menipis"
                  ? "text-warning"
                  : "text-forest-700"
            }`}
          >
            {stockLabel(product.stock)}
          </p>

          <div className="mt-6">
            <ImpactPanel
              co2eKg={product.co2e_avoided_kg}
              plasticG={product.plastic_avoided_g}
              impactNote={product.impact_note}
            />
          </div>

          <button
            type="button"
            disabled={product.stock === 0}
            className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md bg-forest-700 px-6 font-medium text-paper-50 hover:bg-forest-900 disabled:cursor-not-allowed disabled:bg-paper-200 disabled:text-ink-400"
          >
            {product.stock === 0 ? "Stok habis" : "Tambah ke keranjang"}
          </button>

          <div className="mt-8 divide-y divide-paper-200 border-y border-paper-200">
            <details open className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-ink-900 [&::-webkit-details-marker]:hidden">
                Deskripsi
                <ChevronDown
                  className="h-5 w-5 transition-transform group-open:rotate-180"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </summary>
              <p className="mt-3 max-w-prose text-base leading-relaxed text-ink-600">
                {product.description}
              </p>
            </details>

            <details className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-ink-900 [&::-webkit-details-marker]:hidden">
                Spesifikasi
                <ChevronDown
                  className="h-5 w-5 transition-transform group-open:rotate-180"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </summary>
              {product.specs.length > 0 ? (
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  {product.specs.map((spec) => (
                    <div key={`${spec.label}-${spec.value}`}>
                      <dt className="text-ink-600">{spec.label}</dt>
                      <dd className="mt-0.5 font-medium text-ink-900">{spec.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="mt-3 text-sm text-ink-600">Belum ada spesifikasi untuk produk ini.</p>
              )}
            </details>

            <details className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-ink-900 [&::-webkit-details-marker]:hidden">
                Pengiriman
                <ChevronDown
                  className="h-5 w-5 transition-transform group-open:rotate-180"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </summary>
              <div className="mt-3 space-y-2 text-sm leading-relaxed text-ink-600">
                <p>
                  Ongkir flat {rupiah(SHIPPING_ZONES.jawa.rateIdr)} untuk Jawa dan{" "}
                  {rupiah(SHIPPING_ZONES.luarJawa.rateIdr)} untuk luar Jawa.
                </p>
                <p>
                  Gratis ongkir untuk pesanan mulai {rupiah(FREE_SHIPPING_MIN_IDR)}. Berat produk{" "}
                  {angka(product.weight_g)} g.
                </p>
              </div>
            </details>
          </div>

          <p className="mt-4 font-mono text-sm text-forest-700">
            {formatCo2e(product.co2e_avoided_kg)} per unit
          </p>
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <section className="mt-16 border-t border-paper-200 pt-12">
          <h2 className="font-display text-[26px] font-medium text-forest-900 lg:text-4xl">
            Produk terkait
          </h2>
          <div className="mt-6">
            <ProductGrid products={relatedProducts} />
          </div>
        </section>
      )}
    </div>
  );
}
