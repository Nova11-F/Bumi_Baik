import Link from "next/link";
import { co2e as formatCo2e, rupiah } from "@/lib/format";
import { getStockStatus } from "@/lib/stock";
import type { ProductListItem } from "@/types";
import { ProductImage } from "./ProductImage";

type ProductCardProps = {
  product: ProductListItem;
  priority?: boolean;
};

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const categoryName = product.categories?.name ?? "Produk";
  const sdgLabel =
    product.sdg_goals.length > 0 ? ` · SDG ${product.sdg_goals.join(", ")}` : "";
  const stockStatus = getStockStatus(product.stock);

  return (
    <Link href={`/produk/${product.slug}`} className="group block">
      <article className="overflow-hidden rounded-md border border-paper-200 bg-paper-50 transition-colors duration-200 group-hover:border-forest-500">
        <div className="relative aspect-[4/5] overflow-hidden bg-paper-100">
          <ProductImage
            src={product.images[0]}
            name={product.name}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            priority={priority}
            className="transition-transform duration-200 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />

          {stockStatus === "habis" && (
            <span className="absolute left-2 top-2 rounded-sm border border-danger bg-paper-50 px-2 py-0.5 text-sm font-medium text-danger">
              Stok habis
            </span>
          )}
        </div>

        <div className="p-3 lg:p-4">
          <p className="truncate text-sm uppercase tracking-wide text-ink-600">
            {categoryName}
            {sdgLabel}
          </p>
          <h3 className="mt-1 font-display text-xl leading-snug text-forest-900">{product.name}</h3>
          <p className="mt-2 text-base font-semibold text-ink-900">{rupiah(product.price_idr)}</p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-sm bg-forest-100 px-2 py-0.5 font-mono text-sm text-forest-900">
              {formatCo2e(product.co2e_avoided_kg)}
            </span>
            {stockStatus === "menipis" && (
              <span className="text-sm font-medium text-warning">Stok menipis</span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
