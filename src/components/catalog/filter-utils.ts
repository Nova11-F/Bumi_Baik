import type { CatalogParams, CatalogSort } from "@/lib/catalog-query";
import { CATEGORIES, SDG_GOALS } from "@/lib/constants";

export const SORT_OPTIONS: { value: CatalogSort; label: string }[] = [
  { value: "terbaru", label: "Terbaru" },
  { value: "murah", label: "Harga naik" },
  { value: "mahal", label: "Harga turun" },
  { value: "dampak", label: "Dampak terbesar" },
];

export function buildCatalogHref(params: CatalogParams): string {
  const search = new URLSearchParams();

  if (params.q) search.set("q", params.q);
  if (params.kategori.length > 0)
    search.set("kategori", params.kategori.join(","));
  if (params.sdg.length > 0) search.set("sdg", params.sdg.join(","));
  if (params.hargaMin !== null)
    search.set("harga_min", String(params.hargaMin));
  if (params.hargaMax !== null)
    search.set("harga_max", String(params.hargaMax));
  if (params.tersedia) search.set("tersedia", "1");
  if (params.urut !== "terbaru") search.set("urut", params.urut);
  if (params.hal > 1) search.set("hal", String(params.hal));

  const query = search.toString();
  return query ? `/produk?${query}` : "/produk";
}

export function countActiveFilters(params: CatalogParams): number {
  return (
    params.kategori.length +
    params.sdg.length +
    (params.hargaMin !== null || params.hargaMax !== null ? 1 : 0) +
    (params.tersedia ? 1 : 0)
  );
}

export function hasActiveFilters(params: CatalogParams): boolean {
  return countActiveFilters(params) > 0;
}

export function resetFilters(params: CatalogParams): CatalogParams {
  return {
    ...params,
    kategori: [],
    sdg: [],
    hargaMin: null,
    hargaMax: null,
    tersedia: false,
    hal: 1,
  };
}

export function toggleValue<T>(values: T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export function categoryName(slug: string): string {
  return CATEGORIES.find((category) => category.slug === slug)?.name ?? slug;
}

export function sdgName(number: number): string {
  return `SDG ${number} · ${
    SDG_GOALS.find((goal) => goal.number === number)?.name ??
    "Tujuan pembangunan"
  }`;
}
