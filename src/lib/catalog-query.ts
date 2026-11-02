import { cache } from "react";
import { z } from "zod";
import { PRODUCTS_PER_PAGE } from "@/lib/constants";
import { createServerClient } from "@/lib/supabase/server";
import type { ProductListItem, ProductWithCategory } from "@/types";

const PRODUCT_LIST_SELECT =
  "id,slug,name,price_idr,stock,co2e_avoided_kg,plastic_avoided_g,sdg_goals,images,categories(slug,name)";

const pageSchema = z.coerce.number().int().min(1).catch(1);

export type HomeProduct = ProductListItem & { is_featured: boolean };

export type CatalogPage = {
  products: ProductListItem[];
  total: number;
  page: number;
  pageCount: number;
};

export function parseCatalogPage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  return pageSchema.parse(raw);
}

export async function getProductsPage(page: number): Promise<CatalogPage> {
  const supabase = await createServerClient();
  const from = (page - 1) * PRODUCTS_PER_PAGE;

  const { data, error, count } = await supabase
    .from("products")
    .select(PRODUCT_LIST_SELECT, { count: "exact" })
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .order("slug", { ascending: true })
    .range(from, from + PRODUCTS_PER_PAGE - 1)
    .returns<ProductListItem[]>();

  if (error) {
    throw new Error(`GAGAL_MEMUAT_KATALOG:${error.message}`);
  }

  const total = count ?? 0;

  return {
    products: data ?? [],
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PRODUCTS_PER_PAGE)),
  };
}

export const getProductBySlug = cache(
  async (slug: string): Promise<ProductWithCategory | null> => {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from("products")
      .select("*, categories(slug,name)")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      throw new Error(`GAGAL_MEMUAT_PRODUK:${error.message}`);
    }

    return (data as ProductWithCategory | null) ?? null;
  },
);

export async function getRelatedProducts(
  categoryId: number,
  excludeId: string,
  limit = 4,
): Promise<ProductListItem[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_LIST_SELECT)
    .eq("is_active", true)
    .eq("category_id", categoryId)
    .neq("id", excludeId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<ProductListItem[]>();

  if (error) {
    throw new Error(`GAGAL_MEMUAT_PRODUK_TERKAIT:${error.message}`);
  }

  return data ?? [];
}

export const getHomeProducts = cache(async (): Promise<HomeProduct[]> => {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("products")
    .select(`${PRODUCT_LIST_SELECT},is_featured`)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .returns<HomeProduct[]>();

  if (error) {
    throw new Error(`GAGAL_MEMUAT_BERANDA:${error.message}`);
  }

  return data ?? [];
});
