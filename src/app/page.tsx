import Link from "next/link";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ProductImage } from "@/components/product/ProductImage";
import { SdgTag } from "@/components/product/SdgTag";
import { getHomeProducts } from "@/lib/catalog-query";
import { CATEGORIES, SDG_GOALS } from "@/lib/constants";
import { angka, co2e as formatCo2e } from "@/lib/format";

export const revalidate = 300;

export default async function Home() {
  const products = await getHomeProducts();

  const total = products.length;
  const featured = products
    .filter((product) => product.is_featured)
    .slice(0, 4);
  const heroProduct = featured[0] ?? products[0] ?? null;
  const uniqueSdgCount = new Set(
    products.flatMap((product) => product.sdg_goals),
  ).size;

  const topImpactProduct = products.reduce<(typeof products)[number] | null>(
    (best, product) =>
      !best || product.co2e_avoided_kg > best.co2e_avoided_kg ? product : best,
    null,
  );

  const averageCo2e =
    total > 0
      ? products.reduce((sum, product) => sum + product.co2e_avoided_kg, 0) /
        total
      : 0;

  const categoryCounts = CATEGORIES.map((category) => ({
    ...category,
    count: products.filter(
      (product) => product.categories?.slug === category.slug,
    ).length,
  }));

  const sdgCounts = SDG_GOALS.map((goal) => ({
    ...goal,
    count: products.filter((product) => product.sdg_goals.includes(goal.number))
      .length,
  }));

  return (
    <>
      <section className="border-b border-paper-200">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-12 lg:items-center lg:gap-12 lg:px-8 lg:py-24">
          <div className="lg:col-span-6">
            <p className="font-mono text-sm text-forest-700">
              Katalog ramah iklim
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-[40px] font-semibold leading-[1.05] text-forest-900 lg:text-[72px]">
              Produk sehari-hari dengan dampak yang bisa diukur.
            </h1>
            <p className="mt-6 max-w-prose text-lg leading-relaxed text-ink-600">
              Setiap produk menampilkan estimasi CO₂e yang dihindari, bahan yang
              dipakai, dan tag SDG terkait. Angkanya ilustratif, bukan klaim
              tanpa dasar.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/produk"
                className="inline-flex h-11 items-center rounded-md bg-forest-700 px-6 font-medium text-paper-50 hover:bg-forest-900"
              >
                Lihat semua produk
              </Link>
              <Link
                href="/dampak"
                className="inline-flex min-h-11 items-center text-sm font-medium text-forest-700 underline underline-offset-4 hover:text-forest-900"
              >
                Cara menghitung dampak
              </Link>
            </div>

            <p className="mt-8 font-mono text-sm text-ink-600">
              {total} produk · {uniqueSdgCount} SDG · estimasi dampak transparan
            </p>
          </div>

          <div className="lg:col-span-6">
            <div className="relative aspect-[4/5] overflow-hidden rounded-md border border-paper-200 bg-paper-100 sm:aspect-[3/2] lg:aspect-[4/5]">
              <ProductImage
                src={heroProduct?.images[0]}
                name={heroProduct?.name ?? "Bumi Baik"}
                sizes="(min-width: 1024px) 50vw, 100vw"
                priority
              />
            </div>
            {heroProduct && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <p className="text-ink-600">{heroProduct.name}</p>
                <p className="font-mono text-forest-700">
                  {formatCo2e(heroProduct.co2e_avoided_kg)}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-sm text-forest-700">Kategori</p>
            <h2 className="mt-2 font-display text-[26px] font-medium text-forest-900 lg:text-4xl">
              Lima cara mengurangi dampak
            </h2>
          </div>
          <Link
            href="/produk"
            className="inline-flex min-h-11 items-center text-sm font-medium text-forest-700 underline underline-offset-4 hover:text-forest-900"
          >
            Lihat semua produk
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:grid-rows-2">
          {categoryCounts.map((category, index) => {
            const isHighlight = index === 0;
            const isAccent = index === 2;

            return (
              <Link
                key={category.slug}
                href={`/produk?kategori=${category.slug}`}
                className={`flex min-h-[180px] flex-col justify-between rounded-md border p-4 transition-colors hover:border-forest-500 lg:min-h-[170px] lg:p-6 ${
                  isHighlight
                    ? "col-span-2 border-forest-900 bg-forest-900 text-paper-50 lg:row-span-2 lg:min-h-[360px]"
                    : isAccent
                      ? "border-paper-200 bg-clay-100"
                      : "border-paper-200 bg-paper-100"
                }`}
              >
                <span
                  className={`text-sm uppercase tracking-wide ${
                    isHighlight ? "text-forest-100" : "text-ink-600"
                  }`}
                >
                  {category.count} produk
                </span>
                <h3
                  className={`mt-8 font-display leading-tight ${
                    isHighlight
                      ? "text-3xl text-paper-50 lg:text-4xl"
                      : "text-xl text-forest-900 lg:text-2xl"
                  }`}
                >
                  {category.name}
                </h3>
              </Link>
            );
          })}
        </div>
      </section>

      {featured.length > 0 && (
        <section className="border-t border-paper-200 bg-paper-50">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-mono text-sm text-forest-700">Pilihan</p>
                <h2 className="mt-2 font-display text-[26px] font-medium text-forest-900 lg:text-4xl">
                  Produk unggulan
                </h2>
              </div>
              <Link
                href="/produk"
                className="inline-flex min-h-11 items-center text-sm font-medium text-forest-700 underline underline-offset-4 hover:text-forest-900"
              >
                Lihat seluruh katalog
              </Link>
            </div>

            <div className="mt-8">
              <ProductGrid products={featured} priorityCount={2} />
            </div>
          </div>
        </section>
      )}

      <section className="bg-forest-900 text-paper-50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-4">
              <p className="font-mono text-sm text-forest-100">
                Angka di balik label
              </p>
              <h2 className="mt-2 font-display text-[26px] font-medium text-paper-50 lg:text-4xl">
                Dampak yang bisa diperiksa, bukan slogan.
              </h2>
              <p className="mt-4 max-w-prose text-base leading-relaxed text-forest-100">
                Angka di bawah dihitung dari katalog saat ini. Semuanya estimasi
                dan diberi label sebagai estimasi, bukan janji hasil.
              </p>
              <Link
                href="/dampak"
                className="mt-6 inline-flex min-h-11 items-center text-sm font-medium text-paper-50 underline underline-offset-4 hover:text-forest-100"
              >
                Baca metodologi
              </Link>
            </div>

            <div className="lg:col-span-8">
              <div className="grid gap-6 sm:grid-cols-3">
                <div className="border-t border-forest-700 pt-4">
                  <p className="font-mono text-4xl text-paper-50 lg:text-5xl">
                    {total}
                  </p>
                  <p className="mt-2 text-sm text-forest-100">
                    produk aktif di katalog
                  </p>
                </div>

                <div className="border-t border-forest-700 pt-4">
                  <p className="font-mono text-4xl text-paper-50 lg:text-5xl">
                    {angka(averageCo2e)}
                  </p>
                  <p className="mt-2 text-sm text-forest-100">
                    kg CO₂e rata-rata per produk (estimasi)
                  </p>
                </div>

                <div className="border-t border-forest-700 pt-4">
                  <p className="font-mono text-4xl text-paper-50 lg:text-5xl">
                    {topImpactProduct
                      ? angka(topImpactProduct.co2e_avoided_kg)
                      : "0"}
                  </p>
                  <p className="mt-2 text-sm text-forest-100">
                    kg CO₂e pada produk dengan dampak terbesar
                  </p>
                </div>
              </div>

              {topImpactProduct && (
                <div className="mt-8 border-t border-forest-700 pt-5 text-sm text-forest-100">
                  <p>
                    Dampak terbesar:{" "}
                    <Link
                      href={`/produk/${topImpactProduct.slug}`}
                      className="inline-flex min-h-11 items-center font-medium text-paper-50 underline underline-offset-4"
                    >
                      {topImpactProduct.name}
                    </Link>
                  </p>
                  {topImpactProduct.plastic_avoided_g > 0 && (
                    <p className="mt-1 font-mono">
                      {angka(topImpactProduct.plastic_avoided_g / 1000)} kg
                      plastik dihindari per unit
                    </p>
                  )}
                </div>
              )}

              <div className="mt-8 border-t border-forest-700 pt-5">
                <p className="text-sm text-forest-100">Jumlah produk per SDG</p>
                <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {sdgCounts.map((goal) => (
                    <li key={goal.number}>
                      <p className="font-mono text-sm text-paper-50">
                        SDG {goal.number}
                      </p>
                      <p className="mt-1 font-mono text-2xl text-paper-50">
                        {goal.count}
                      </p>
                      <p className="mt-1 text-sm text-forest-100">produk</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-4">
            <p className="font-mono text-sm text-forest-700">SDGs</p>
            <h2 className="mt-2 font-display text-[26px] font-medium text-forest-900 lg:text-4xl">
              Empat tujuan yang kami ikuti
            </h2>
            <p className="mt-4 max-w-prose text-base leading-relaxed text-ink-600">
              Setiap produk dipetakan ke setidaknya satu tujuan. Tag SDG
              membantu Anda membaca alasan di balik pilihan produk, bukan
              sekadar label.
            </p>
          </div>

          <ul className="divide-y divide-paper-200 border-y border-paper-200 lg:col-span-8">
            {sdgCounts.map((goal) => (
              <li
                key={goal.number}
                className="grid gap-3 py-5 sm:grid-cols-[48px_1fr_auto] sm:items-start"
              >
                <SdgTag goal={goal.number} />
                <div>
                  <h3 className="font-display text-xl text-forest-900">
                    {goal.name}
                  </h3>
                  <p className="mt-1 max-w-prose text-sm leading-relaxed text-ink-600">
                    {goal.role}
                  </p>
                </div>
                <p className="font-mono text-sm text-ink-600">
                  {goal.count} produk
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
