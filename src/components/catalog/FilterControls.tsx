"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import type { CatalogParams } from "@/lib/catalog-query";
import { CATEGORIES, SDG_GOALS } from "@/lib/constants";
import {
  buildCatalogHref,
  countActiveFilters,
  resetFilters,
  toggleValue,
} from "./filter-utils";

type FilterControlsProps = {
  params: CatalogParams;
  total: number;
  variant: "sidebar" | "sheet";
  onApplied?: () => void;
};

export function FilterControls({
  params,
  total,
  variant,
  onApplied,
}: FilterControlsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [minPrice, setMinPrice] = useState(params.hargaMin?.toString() ?? "");
  const [maxPrice, setMaxPrice] = useState(params.hargaMax?.toString() ?? "");
  const priceId = useId();
  const activeCount = countActiveFilters(params);

  useEffect(() => {
    setMinPrice(params.hargaMin?.toString() ?? "");
    setMaxPrice(params.hargaMax?.toString() ?? "");
  }, [params.hargaMin, params.hargaMax]);

  function apply(next: CatalogParams) {
    startTransition(() => {
      router.replace(buildCatalogHref({ ...next, hal: 1 }), { scroll: false });
    });
  }

  function applyPrice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedMin = minPrice.trim() === "" ? null : Number(minPrice);
    const parsedMax = maxPrice.trim() === "" ? null : Number(maxPrice);

    apply({
      ...params,
      hargaMin:
        parsedMin !== null && Number.isFinite(parsedMin) && parsedMin >= 0
          ? parsedMin
          : null,
      hargaMax:
        parsedMax !== null && Number.isFinite(parsedMax) && parsedMax >= 0
          ? parsedMax
          : null,
    });
  }

  return (
    <div
      className={
        isPending ? "opacity-60 transition-opacity" : "transition-opacity"
      }
    >
      {variant === "sidebar" && (
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl text-forest-900">Filter</h2>
          <SlidersHorizontal
            className="h-5 w-5 text-forest-700"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </div>
      )}

      <div
        className={`${variant === "sidebar" ? "mt-4" : ""} divide-y divide-paper-200`}
      >
        <FilterGroup title="Kategori">
          <ul className="space-y-2">
            {CATEGORIES.map((category) => {
              const checked = params.kategori.includes(category.slug);
              return (
                <li key={category.slug}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink-900">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        apply({
                          ...params,
                          kategori: toggleValue(params.kategori, category.slug),
                        })
                      }
                      className="h-4 w-4 shrink-0 accent-forest-700"
                    />
                    <span>{category.name}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </FilterGroup>

        <FilterGroup title="SDG">
          <ul className="space-y-2">
            {SDG_GOALS.map((goal) => {
              const checked = params.sdg.includes(goal.number);
              return (
                <li key={goal.number}>
                  <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2 text-sm text-ink-900">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        apply({
                          ...params,
                          sdg: toggleValue(params.sdg, goal.number),
                        })
                      }
                      className="mt-0.5 h-4 w-4 shrink-0 accent-forest-700"
                    />
                    <span>
                      <span className="font-mono text-forest-700">
                        SDG {goal.number}
                      </span>
                      <span className="block text-ink-600">{goal.name}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </FilterGroup>

        <FilterGroup title="Rentang harga">
          <form onSubmit={applyPrice} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label
                  htmlFor={`${priceId}-min`}
                  className="mb-1 block text-sm text-ink-600"
                >
                  Minimum
                </label>
                <input
                  id={`${priceId}-min`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1000}
                  value={minPrice}
                  onChange={(event) => setMinPrice(event.target.value)}
                  placeholder="0"
                  className="h-11 w-full rounded-md border border-paper-200 bg-white px-3 text-base text-ink-900 placeholder:text-ink-400 focus:border-forest-700 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor={`${priceId}-max`}
                  className="mb-1 block text-sm text-ink-600"
                >
                  Maksimum
                </label>
                <input
                  id={`${priceId}-max`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1000}
                  value={maxPrice}
                  onChange={(event) => setMaxPrice(event.target.value)}
                  placeholder="Tanpa batas"
                  className="h-11 w-full rounded-md border border-paper-200 bg-white px-3 text-base text-ink-900 placeholder:text-ink-400 focus:border-forest-700 focus:outline-none"
                />
              </div>
            </div>
            <button
              type="submit"
              className="inline-flex h-11 w-full items-center justify-center rounded-md border border-forest-700 px-4 font-medium text-forest-700 hover:bg-forest-100"
            >
              Terapkan harga
            </button>
          </form>
        </FilterGroup>

        <FilterGroup title="Ketersediaan">
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink-900">
            <input
              type="checkbox"
              checked={params.tersedia}
              onChange={() => apply({ ...params, tersedia: !params.tersedia })}
              className="h-4 w-4 shrink-0 accent-forest-700"
            />
            <span>Hanya yang tersedia</span>
          </label>
        </FilterGroup>
      </div>

      {activeCount > 0 && (
        <button
          type="button"
          onClick={() => apply(resetFilters(params))}
          className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-md px-4 text-sm font-medium text-forest-700 underline underline-offset-4 hover:text-forest-900"
        >
          Reset filter ({activeCount})
        </button>
      )}

      {variant === "sheet" && (
        <button
          type="button"
          onClick={onApplied}
          className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-md bg-forest-700 px-4 font-medium text-paper-50 hover:bg-forest-900"
        >
          Lihat {total} produk
        </button>
      )}
    </div>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details open className="group py-4">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-forest-900 [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown
          className="h-4 w-4 shrink-0 text-forest-700 transition-transform group-open:rotate-180"
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </summary>
      <div className="pt-2">{children}</div>
    </details>
  );
}
