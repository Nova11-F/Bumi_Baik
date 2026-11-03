"use client";

import { useId, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CatalogParams, CatalogSort } from "@/lib/catalog-query";
import { buildCatalogHref, SORT_OPTIONS } from "./filter-utils";

type SortSelectProps = {
  params: CatalogParams;
};

export function SortSelect({ params }: SortSelectProps) {
  const router = useRouter();
  const selectId = useId();
  const [isPending, startTransition] = useTransition();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const urut = event.target.value as CatalogSort;

    startTransition(() => {
      router.replace(buildCatalogHref({ ...params, urut, hal: 1 }), {
        scroll: false,
      });
    });
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={selectId} className="shrink-0 text-sm text-ink-600">
        Urutkan
      </label>
      <select
        id={selectId}
        value={params.urut}
        onChange={handleChange}
        aria-busy={isPending}
        className="h-11 rounded-md border border-paper-200 bg-white px-3 text-base text-ink-900 focus:border-forest-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
