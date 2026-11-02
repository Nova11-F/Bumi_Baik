import type { ProductListItem } from "@/types";
import { ProductCard } from "./ProductCard";

type ProductGridProps = {
  products: ProductListItem[];
  priorityCount?: number;
};

export function ProductGrid({ products, priorityCount = 0 }: ProductGridProps) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-12">
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} priority={index < priorityCount} />
      ))}
    </div>
  );
}
