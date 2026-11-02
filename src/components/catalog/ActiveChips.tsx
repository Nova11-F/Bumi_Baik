"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import type { CatalogParams } from "@/lib/catalog-query";
import { rupiah } from "@/lib/format";
import {
  buildCatalogHref,
  categoryName,
  countActiveFilters,
  resetFilters,
} from "./filter-utils";

type ActiveChipsProps = {
  params: CatalogParams;
};

type Chip = {
  key: string;
  label: string;
  remove: CatalogParams;
};

export function ActiveChips({ params }: ActiveChipsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const activeCount = countActiveFilters(params);
  const chips: Chip[] = [];

  if (params.q) {
    chips.push({
      key: "q",
      label: `Cari: “${params.q}”`,
      remove: { ...params, q: "", hal: 1 },
    });
  }

  for (const slug of params.kategori) {
    chips.push({
      key: `kategori-${slug}`,
      label: categoryName(slug),
      remove: {
        ...params,
        kategori: params.kategori.filter((item) => item !== slug),
        hal: 1,
      },
    });
  }

  for (const sdg of params.sdg) {
    chips.push({
      key: `sdg-${sdg}`,
      label: `SDG ${sdg}`,
      remove: {
        ...params,
        sdg: params.sdg.filter((item) => item !== sdg),
        hal: 1,
      },
    });
  }

  if (params.hargaMin !== null || params.hargaMax !== null) {
    const label =
      params.hargaMin !== null && params.hargaMax !== null
        ? `Harga ${rupiah(params.hargaMin)} – ${rupiah(params.hargaMax)}`
        : params.hargaMin !== null
          ? `Harga ≥ ${rupiah(params.hargaMin)}`
          : `Harga ≤ ${rupiah(params.hargaMax ?? 0)}`;

    chips.push({
      key: "harga",
      label,
      remove: { ...params, hargaMin: null, hargaMax: null, hal: 1 },
    });
  }

  if (params.tersedia) {
    chips.push({
      key: "tersedia",
      label: "Hanya tersedia",
      remove: { ...params, tersedia: false, hal: 1 },
    });
  }

  if (chips.length === 0) return null;

  function navigate(next: CatalogParams) {
    startTransition(() => {
      router.replace(buildCatalogHref(next), { scroll: false });
    });
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${isPending ? "opacity-60" : ""}`}
      aria-busy={isPending}
    >
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex min-h-8 items-center gap-1 rounded-sm bg-forest-100 py-1 pl-2.5 pr-1 text-sm text-forest-900"
        >
          {chip.label}
          <button
            type="button"
            onClick={() => navigate(chip.remove)}
            aria-label={`Hapus filter ${chip.label}`}
            className="flex h-8 w-8 items-center justify-center rounded-sm hover:bg-forest-500/15"
          >
            <X className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
        </span>
      ))}

      {activeCount > 0 && (
        <button
          type="button"
          onClick={() => navigate(resetFilters(params))}
          className="ml-1 text-sm font-medium text-forest-700 underline underline-offset-4 hover:text-forest-900"
        >
          Reset filter ({activeCount})
        </button>
      )}
    </div>
  );
}
