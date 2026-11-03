import type { Metadata } from "next";
import Link from "next/link";
import { SdgTag } from "@/components/product/SdgTag";
import { angka } from "@/lib/format";
import { createServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dampak dan metodologi",
  description:
    "Pelajari estimasi dampak produk Bumi Baik, asumsi yang dicatat, dan keterbatasan perhitungannya.",
};

type DampakSearchParams = {
  urut?: string | string[];
};

type ImpactSort = "co2e" | "plastik";

function parseImpactSort(value: DampakSearchParams["urut"]): ImpactSort {
  const sort = Array.isArray(value) ? value[0] : value;
  return sort === "plastik" ? "plastik" : "co2e";
}

export default async function DampakPage({
  searchParams,
}: {
  searchParams: Promise<DampakSearchParams>;
}) {
  const sort = parseImpactSort((await searchParams).urut);
  const supabase = await createServerClient();
  const { data: products, error } = await supabase
    .from("products")
    .select(
      "slug, name, co2e_avoided_kg, plastic_avoided_g, impact_note, sdg_goals",
    )
    .eq("is_active", true)
    .order(sort === "plastik" ? "plastic_avoided_g" : "co2e_avoided_kg", {
      ascending: false,
    })
    .order("name", { ascending: true });

  if (error) {
    throw new Error("Data dampak produk belum berhasil dimuat.", {
      cause: error,
    });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
      <header className="grid gap-6 border-b border-paper-200 pb-10 lg:grid-cols-12 lg:items-end lg:gap-10 lg:pb-12">
        <div className="lg:col-span-8">
          <p className="font-mono text-sm text-forest-700">
            Catatan dampak Bumi Baik
          </p>
          <h1 className="mt-3 font-display text-[32px] font-semibold leading-[1.1] text-forest-900 lg:text-5xl">
            Dampak yang dicatat, asumsi yang dibuka
          </h1>
        </div>
        <p className="max-w-prose text-lg leading-relaxed text-ink-600 lg:col-span-4">
          Angka pada halaman ini adalah estimasi per unit produk. Kami
          menampilkan catatan asumsi yang tersedia agar pembeli dapat melihat
          apa yang mendasari setiap nilai.
        </p>
      </header>

      <section
        id="metodologi"
        aria-labelledby="metodologi-heading"
        className="grid gap-6 border-b border-paper-200 py-12 lg:grid-cols-12 lg:gap-10 lg:py-16"
      >
        <div className="lg:col-span-4">
          <p className="font-mono text-sm text-forest-700">01 / Cara membaca</p>
          <h2
            id="metodologi-heading"
            className="mt-3 font-display text-[26px] font-medium text-forest-900 lg:text-4xl"
          >
            Bagaimana kami menghitung
          </h2>
        </div>
        <div className="max-w-prose space-y-4 text-base leading-relaxed text-ink-600 lg:col-span-7 lg:col-start-6">
          <p>
            Nilai CO₂e dan plastik adalah estimasi, bukan hasil pengukuran
            langsung dari setiap penggunaan. Gagasan dasarnya adalah
            membandingkan produk dengan barang atau sumber energi yang mungkin
            digantikannya. Pembanding hanya bisa dijelaskan bila catatan produk
            menyebutkannya.
          </p>
          <p>
            Lama pemakaian dan pola penggunaan juga memengaruhi hasil. Tabel
            berikut menampilkan catatan asumsi dari data produk; jika catatan
            tidak menjelaskan baseline atau umur pakai, informasi tersebut belum
            tersedia dan tidak kami isi dengan asumsi baru.
          </p>
          <div className="space-y-2 border-l-2 border-forest-500 pl-4 text-sm">
            <p>[PERLU DIISI: sumber faktor emisi]</p>
            <p>[PERLU DIISI: sumber dan skenario baseline tiap produk]</p>
            <p>[PERLU DIISI: sumber asumsi umur pakai tiap produk]</p>
          </div>
        </div>
      </section>

      <section
        id="transparansi"
        aria-labelledby="transparansi-heading"
        className="border-b border-paper-200 py-12 lg:py-16"
      >
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-sm text-forest-700">
              02 / Data katalog
            </p>
            <h2
              id="transparansi-heading"
              className="mt-3 font-display text-[26px] font-medium text-forest-900 lg:text-4xl"
            >
              Transparansi per produk
            </h2>
          </div>
          <form
            action="/dampak#transparansi"
            method="get"
            className="flex flex-wrap items-end gap-3"
          >
            <label className="flex flex-col gap-1 text-sm font-medium text-ink-900">
              Urutkan menurut dampak
              <select
                name="urut"
                defaultValue={sort}
                className="h-11 min-w-48 rounded-md border border-paper-200 bg-white px-3 text-base text-ink-900 focus:border-forest-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700"
              >
                <option value="co2e">Estimasi CO₂e terbesar</option>
                <option value="plastik">Estimasi plastik terbesar</option>
              </select>
            </label>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-md border border-forest-700 px-5 font-medium text-forest-700 hover:bg-forest-100"
            >
              Urutkan
            </button>
          </form>
        </div>

        {products && products.length > 0 ? (
          <>
            <div className="mt-6 hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[880px] border-collapse text-left">
                <thead>
                  <tr className="border-y border-paper-200 bg-paper-100 text-sm text-ink-600">
                    <th scope="col" className="px-4 py-3 font-medium">
                      Produk
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      CO₂e dihindari (estimasi)
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Plastik dihindari (estimasi)
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Catatan asumsi (estimasi)
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      SDG
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr
                      key={product.slug}
                      className="border-b border-paper-200 align-top"
                    >
                      <th
                        scope="row"
                        className="min-w-48 px-4 py-4 font-medium"
                      >
                        <Link
                          href={`/produk/${product.slug}`}
                          className="inline-flex min-h-11 items-center text-forest-700 underline-offset-4 hover:underline"
                        >
                          {product.name}
                        </Link>
                      </th>
                      <td className="whitespace-nowrap px-4 py-4 font-mono text-sm">
                        Estimasi {angka(product.co2e_avoided_kg)} kg CO₂e
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 font-mono text-sm">
                        Estimasi {angka(product.plastic_avoided_g)} g
                      </td>
                      <td className="min-w-64 max-w-md px-4 py-4 text-sm leading-relaxed text-ink-600">
                        {product.impact_note
                          ? `Catatan estimasi: ${product.impact_note}`
                          : "Catatan asumsi belum tersedia."}
                      </td>
                      <td className="px-4 py-4">
                        <div
                          className="flex flex-wrap gap-1.5"
                          aria-label={`SDG ${product.sdg_goals.join(", ") || "belum ditentukan"}`}
                        >
                          {product.sdg_goals.map((goal: number) => (
                            <SdgTag key={goal} goal={goal} />
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="mt-6 divide-y divide-paper-200 border-y border-paper-200 lg:hidden">
              {products.map((product) => (
                <li key={product.slug} className="py-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="min-w-0 flex-1 font-display text-xl text-forest-900">
                      <Link
                        href={`/produk/${product.slug}`}
                        className="inline-flex min-h-11 items-center underline-offset-4 hover:underline"
                      >
                        {product.name}
                      </Link>
                    </h3>
                    <div className="flex gap-1.5">
                      {product.sdg_goals.map((goal: number) => (
                        <SdgTag key={goal} goal={goal} />
                      ))}
                    </div>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <dt className="text-sm text-ink-600">
                        CO₂e dihindari (estimasi)
                      </dt>
                      <dd className="mt-1 font-mono text-sm text-forest-900">
                        {angka(product.co2e_avoided_kg)} kg
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-ink-600">
                        Plastik dihindari (estimasi)
                      </dt>
                      <dd className="mt-1 font-mono text-sm text-forest-900">
                        {angka(product.plastic_avoided_g)} g
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-3 text-sm leading-relaxed text-ink-600">
                    {product.impact_note
                      ? `Catatan estimasi: ${product.impact_note}`
                      : "Catatan asumsi belum tersedia."}
                  </p>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="mt-6 border-y border-paper-200 py-8">
            <p className="text-base text-ink-600">
              Data estimasi dampak produk belum tersedia.
            </p>
            <Link
              href="/produk"
              className="mt-4 inline-flex min-h-11 items-center rounded-md bg-forest-700 px-6 font-medium text-paper-50 hover:bg-forest-900"
            >
              Jelajahi produk
            </Link>
          </div>
        )}
      </section>

      <section
        aria-labelledby="sdg-heading"
        className="grid gap-6 border-b border-paper-200 py-12 lg:grid-cols-12 lg:gap-10 lg:py-16"
      >
        <div className="lg:col-span-4">
          <p className="font-mono text-sm text-forest-700">03 / Arah dampak</p>
          <h2
            id="sdg-heading"
            className="mt-3 font-display text-[26px] font-medium text-forest-900 lg:text-4xl"
          >
            Tujuan pembangunan berkelanjutan
          </h2>
        </div>
        <ul className="lg:col-span-7 lg:col-start-6">
          <li className="flex gap-4 border-t border-paper-200 py-4">
            <SdgTag goal={7} />
            <p className="text-base leading-relaxed text-ink-600">
              SDG 7 — Energi Bersih dan Terjangkau: produk surya dan hemat
              energi membantu penggunaan energi sehari-hari.
            </p>
          </li>
          <li className="flex gap-4 border-t border-paper-200 py-4">
            <SdgTag goal={12} />
            <p className="text-base leading-relaxed text-ink-600">
              SDG 12 — Konsumsi dan Produksi yang Bertanggung Jawab: produk guna
              ulang, isi ulang, dan pengganti plastik sekali pakai.
            </p>
          </li>
          <li className="flex gap-4 border-t border-paper-200 py-4">
            <SdgTag goal={13} />
            <p className="text-base leading-relaxed text-ink-600">
              SDG 13 — Penanganan Perubahan Iklim: katalog mencatat estimasi
              CO₂e yang dihindari untuk tiap produk.
            </p>
          </li>
          <li className="flex gap-4 border-y border-paper-200 py-4">
            <SdgTag goal={15} />
            <p className="text-base leading-relaxed text-ink-600">
              SDG 15 — Ekosistem Daratan: produk berkebun, kompos, dan bibit
              mendukung kegiatan merawat tanaman dan tanah.
            </p>
          </li>
        </ul>
      </section>

      <section
        aria-labelledby="keterbatasan-heading"
        className="grid gap-6 py-12 lg:grid-cols-12 lg:gap-10 lg:py-16"
      >
        <div className="lg:col-span-4">
          <p className="font-mono text-sm text-forest-700">04 / Batas data</p>
          <h2
            id="keterbatasan-heading"
            className="mt-3 font-display text-[26px] font-medium text-forest-900 lg:text-4xl"
          >
            Keterbatasan
          </h2>
        </div>
        <div className="max-w-prose space-y-4 text-base leading-relaxed text-ink-600 lg:col-span-7 lg:col-start-6">
          <p>
            Semua nilai dampak saat ini adalah estimasi ilustratif untuk MVP dan
            belum diverifikasi oleh pihak ketiga. Hasil sebenarnya dapat berbeda
            menurut produk pembanding, lama pemakaian, dan kebiasaan pengguna.
          </p>
          <p>
            Kami akan memperbarui angka setelah sumber faktor emisi, baseline,
            asumsi umur pakai, dan cara hitung tiap produk dapat dicantumkan.
            Perubahan metode dan tanggal pembaruan akan dijelaskan bersama data
            yang diperbarui.
          </p>
        </div>
      </section>
    </div>
  );
}
