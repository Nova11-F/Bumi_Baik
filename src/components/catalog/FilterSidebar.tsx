import type { CatalogParams } from "@/lib/catalog-query";
import { FilterControls } from "./FilterControls";

type FilterSidebarProps = {
  params: CatalogParams;
  total: number;
};

export function FilterSidebar({ params, total }: FilterSidebarProps) {
  return (
    <aside
      aria-label="Filter produk"
      className="hidden w-[260px] shrink-0 lg:block"
    >
      <div className="sticky top-24 rounded-md border border-paper-200 bg-paper-50 p-4">
        <FilterControls params={params} total={total} variant="sidebar" />
      </div>
    </aside>
  );
}
